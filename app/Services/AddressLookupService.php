<?php

namespace App\Services;

use App\Rules\SafeText;
use App\Support\AddressToken;
use App\Support\MapsLog;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AddressLookupService
{
    private const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';

    private const DETAILS_URL = 'https://places.googleapis.com/v1/places/';

    /**
     * Só placeId e os textos da sugestão. O SKU do Autocomplete não muda com a máscara;
     * ela só evita pedir distância, tipos extras e o corpo cru.
     */
    private const AUTOCOMPLETE_MASK = 'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text';

    /**
     * addressComponents está no SKU Place Details Essentials.
     * Não pedir displayName, location nem fotos: isso sobe de categoria.
     */
    private const DETAILS_MASK = 'addressComponents';

    private const BIAS_RADIUS_METERS = 20000.0;

    public function __construct(
        private readonly MapsUsage $usage,
        private readonly AddressToken $tokens,
    ) {}

    /**
     * @return array{enabled: bool, suggestions: array<int, array{place_id: string, main_text: string, secondary_text: string}>}
     */
    public function suggest(string $query, string $sessionToken): array
    {
        $empty = ['enabled' => false, 'suggestions' => []];

        if (! $this->usage->allows(MapsUsage::AUTOCOMPLETE)) {
            $this->usage->noteBlocked(MapsUsage::AUTOCOMPLETE);

            return $empty;
        }

        $key = $this->apiKey();

        if ($key === null) {
            return $empty;
        }

        try {
            $this->usage->hit(MapsUsage::AUTOCOMPLETE);
            $response = Http::withHeaders([
                'X-Goog-Api-Key' => $key,
                'X-Goog-FieldMask' => self::AUTOCOMPLETE_MASK,
            ])->acceptJson()
                ->asJson()
                ->connectTimeout(5)
                ->timeout(5)
                ->post(self::AUTOCOMPLETE_URL, $this->autocompleteBody($query, $sessionToken));
        } catch (ConnectionException $exception) {
            $this->logPlaces('autocomplete', 0, 'timeout', $exception->getMessage(), '');

            return $empty;
        } catch (\Throwable $exception) {
            $this->logPlaces('autocomplete', 0, 'unexpected', $exception->getMessage(), '');

            return $empty;
        }

        if ($response->status() !== 200 || ! is_array($response->json())) {
            $this->logPlacesResponse('autocomplete', $response);

            return $empty;
        }

        return [
            'enabled' => true,
            'suggestions' => $this->suggestions($response->json()),
        ];
    }

    /**
     * @return array{street: string, neighborhood: string, address_token: string}
     */
    public function resolve(string $placeId, string $sessionToken): array
    {
        if (! $this->usage->allows(MapsUsage::DETAILS)) {
            $this->usage->noteBlocked(MapsUsage::DETAILS);
            $this->unavailable();
        }

        $key = $this->apiKey();

        if ($key === null) {
            $this->unavailable();
        }

        try {
            $this->usage->hit(MapsUsage::DETAILS);
            $response = Http::withHeaders([
                'X-Goog-Api-Key' => $key,
                'X-Goog-FieldMask' => self::DETAILS_MASK,
            ])->acceptJson()
                ->connectTimeout(5)
                ->timeout(5)
                ->get(self::DETAILS_URL.rawurlencode($placeId), [
                    'sessionToken' => $sessionToken,
                ]);
        } catch (ConnectionException $exception) {
            $this->logPlaces('details', 0, 'timeout', $exception->getMessage(), '');
            $this->unavailable();
        } catch (\Throwable $exception) {
            $this->logPlaces('details', 0, 'unexpected', $exception->getMessage(), '');
            $this->unavailable();
        }

        $status = $response->status();
        $json = $response->json();

        if ($status === 400 || $status === 404) {
            throw ValidationException::withMessages([
                'place_id' => 'Selecione o endereço novamente.',
            ]);
        }

        if ($status !== 200 || ! is_array($json)) {
            $this->logPlacesResponse('details', $response);
            $this->unavailable();
        }

        $components = $json['addressComponents'] ?? null;

        if (! is_array($components)) {
            $this->missingNeighborhood();
        }

        $byType = $this->indexComponents($components);
        $this->assertInStoreCity($byType);

        $street = $this->officialText($byType['route'] ?? null);
        $neighborhood = $this->neighborhoodFrom($byType);

        if (! $this->fits($street, 3, 80)) {
            throw ValidationException::withMessages([
                'place_id' => 'Não conseguimos identificar a rua. Use a opção Não encontrei meu endereço.',
            ]);
        }

        if ($neighborhood === null) {
            $this->missingNeighborhood();
        }

        return [
            'street' => $street,
            'neighborhood' => $neighborhood,
            'address_token' => $this->tokens->issue($street, $neighborhood),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function autocompleteBody(string $query, string $sessionToken): array
    {
        $body = [
            'input' => $query,
            'includedRegionCodes' => ['br'],
            'regionCode' => 'br',
            'languageCode' => 'pt-BR',
            'sessionToken' => $sessionToken,
            'includedPrimaryTypes' => ['route'],
        ];

        $lat = config('store.lat');
        $lng = config('store.lng');

        if (is_numeric($lat) && is_numeric($lng)) {
            $body['locationBias'] = [
                'circle' => [
                    'center' => [
                        'latitude' => (float) $lat,
                        'longitude' => (float) $lng,
                    ],
                    'radius' => self::BIAS_RADIUS_METERS,
                ],
            ];
        }

        return $body;
    }

    /**
     * @param  array<string, mixed>  $json
     * @return array<int, array{place_id: string, main_text: string, secondary_text: string}>
     */
    private function suggestions(array $json): array
    {
        $rows = $json['suggestions'] ?? [];
        $suggestions = [];

        if (! is_array($rows)) {
            return [];
        }

        foreach ($rows as $row) {
            if (count($suggestions) >= 5 || ! is_array($row)) {
                continue;
            }

            $prediction = $row['placePrediction'] ?? null;

            if (! is_array($prediction)) {
                continue;
            }

            $placeId = $prediction['placeId'] ?? '';
            $main = data_get($prediction, 'structuredFormat.mainText.text');
            $secondary = data_get($prediction, 'structuredFormat.secondaryText.text');

            if (! is_string($placeId) || preg_match('/^[A-Za-z0-9_\-:]+$/', $placeId) !== 1) {
                continue;
            }

            if (! is_string($main) || trim($main) === '') {
                continue;
            }

            $suggestions[] = [
                'place_id' => $placeId,
                'main_text' => trim($main),
                'secondary_text' => is_string($secondary) ? trim($secondary) : '',
            ];
        }

        return $suggestions;
    }

    /**
     * @param  array<int, mixed>  $components
     * @return array<string, array<string, mixed>>
     */
    private function indexComponents(array $components): array
    {
        $indexed = [];

        foreach ($components as $component) {
            if (! is_array($component) || ! is_array($component['types'] ?? null)) {
                continue;
            }

            foreach ($component['types'] as $type) {
                if (is_string($type) && ! isset($indexed[$type])) {
                    $indexed[$type] = $component;
                }
            }
        }

        return $indexed;
    }

    /**
     * @param  array<string, array<string, mixed>>  $byType
     */
    private function assertInStoreCity(array $byType): void
    {
        $expectedCity = $this->fold((string) config('store.city'));
        $expectedState = $this->fold((string) config('store.state'));
        $cities = array_filter([
            $this->fold($this->longText($byType['locality'] ?? null)),
            $this->fold($this->longText($byType['administrative_area_level_2'] ?? null)),
        ]);
        $state = $byType['administrative_area_level_1'] ?? null;
        $stateShort = $this->fold($this->shortText($state));
        $stateLong = $this->fold($this->longText($state));
        $cityOk = $expectedCity !== '' && in_array($expectedCity, $cities, true);
        $stateOk = $expectedState !== '' && ($stateShort === $expectedState || $stateLong === $expectedState);

        if (! $cityOk || ! $stateOk) {
            throw ValidationException::withMessages([
                'place_id' => 'Esse endereço não é atendido por aqui.',
            ]);
        }
    }

    /**
     * @param  array<string, array<string, mixed>>  $byType
     */
    private function neighborhoodFrom(array $byType): ?string
    {
        foreach (['sublocality_level_1', 'neighborhood', 'sublocality'] as $type) {
            $name = $this->officialText($byType[$type] ?? null);

            if ($this->fits($name, 2, 60)) {
                return $name;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>|null  $component
     */
    private function officialText(?array $component): string
    {
        $text = SafeText::normalize($this->longText($component));

        return is_string($text) ? $text : '';
    }

    /**
     * @param  array<string, mixed>|null  $component
     */
    private function longText(?array $component): string
    {
        $text = $component['longText'] ?? '';

        return is_string($text) ? trim($text) : '';
    }

    /**
     * @param  array<string, mixed>|null  $component
     */
    private function shortText(?array $component): string
    {
        $text = $component['shortText'] ?? '';

        return is_string($text) ? trim($text) : '';
    }

    private function fits(string $value, int $min, int $max): bool
    {
        $length = mb_strlen($value);

        if ($length < $min || $length > $max) {
            return false;
        }

        $failed = false;
        (new SafeText())->validate('address', $value, function () use (&$failed) {
            $failed = true;
        });

        return ! $failed;
    }

    private function fold(string $value): string
    {
        $value = Str::ascii(mb_strtolower(trim($value)));

        return preg_replace('/\s+/', ' ', $value) ?? $value;
    }

    private function apiKey(): ?string
    {
        $key = config('services.google_maps.key');

        return is_string($key) && $key !== '' ? $key : null;
    }

    private function unavailable(): never
    {
        throw ValidationException::withMessages([
            'place_id' => 'A busca de endereços está indisponível. Use a opção Não encontrei meu endereço.',
        ]);
    }

    private function missingNeighborhood(): never
    {
        throw ValidationException::withMessages([
            'place_id' => 'Não conseguimos identificar o bairro. Use a opção Não encontrei meu endereço.',
        ]);
    }

    private function logPlacesResponse(string $api, Response $response): void
    {
        $json = $response->json();
        $googleStatus = is_array($json) ? (string) data_get($json, 'error.status', '') : '';
        $googleMessage = is_array($json) ? (string) data_get($json, 'error.message', '') : '';
        $this->logPlaces($api, $response->status(), $googleStatus !== '' ? $googleStatus : 'http', $googleMessage, (string) $response->body());
    }

    private function logPlaces(string $api, int $status, string $googleStatus, string $googleMessage, string $body): void
    {
        $quota = $status === 429 || $googleStatus === 'RESOURCE_EXHAUSTED';
        $message = $quota
            ? 'Google Places API recusou a busca porque a cota estourou (429).'
            : 'Falha na Google Places API ('.$api.').';

        MapsLog::error($message, $status, $googleStatus, $googleMessage, $body);
    }
}
