<?php

namespace App\Services;

use App\Exceptions\DeliveryQuoteUnavailableException;
use App\Models\DeliveryZone;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class DeliveryQuoteService
{
    private const ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';

    private const FIELD_MASK = 'routes.distanceMeters,geocodingResults.destination.partialMatch';

    /**
     * Distância de carro e a faixa mais barata que cobre essa distância.
     * Sucesso (a distância) fica em cache por 24 h. Falha da API não fica.
     *
     * @return array{distance_km: string, fee_amount: string, delivery_zone_id: int}
     */
    public function quote(string $street, string $number, string $neighborhood): array
    {
        $zones = DeliveryZone::query()->orderBy('radius_km')->orderBy('id')->get();

        if ($zones->isEmpty()) {
            throw ValidationException::withMessages([
                'address' => 'A entrega não está disponível no momento.',
            ]);
        }

        $distanceKm = $this->distanceKm($street, $number, $neighborhood);

        return $this->matchZone($zones, $distanceKm);
    }

    private function distanceKm(string $street, string $number, string $neighborhood): string
    {
        $cacheKey = $this->cacheKey($street, $number, $neighborhood);
        $cached = Cache::get($cacheKey);

        if (is_string($cached) && preg_match('/^\d+\.\d{2}$/', $cached) === 1) {
            Log::info('Cotação de entrega atendida pelo cache.');

            return $cached;
        }

        $distanceKm = $this->fetchDistanceKm($street, $number, $neighborhood);
        Cache::put($cacheKey, $distanceKm, now()->addHours(24));

        return $distanceKm;
    }

    private function fetchDistanceKm(string $street, string $number, string $neighborhood): string
    {
        $key = config('services.google_maps.key');
        $lat = config('store.lat');
        $lng = config('store.lng');
        $city = trim((string) config('store.city'));
        $state = trim((string) config('store.state'));

        if (! is_string($key) || $key === '' || ! is_numeric($lat) || ! is_numeric($lng) || $city === '' || $state === '') {
            Log::error('Cotação de entrega indisponível: falta a chave da Routes API ou a origem da loja.');

            throw new DeliveryQuoteUnavailableException();
        }

        $payload = [
            'origin' => [
                'location' => [
                    'latLng' => [
                        'latitude' => (float) $lat,
                        'longitude' => (float) $lng,
                    ],
                ],
            ],
            'destination' => [
                'address' => $this->destinationAddress($street, $number, $neighborhood, $city, $state),
            ],
            'travelMode' => 'DRIVE',
            'routingPreference' => 'TRAFFIC_UNAWARE',
            'regionCode' => 'br',
            'languageCode' => 'pt-BR',
        ];

        $response = $this->requestRoutes($payload, $key);

        return $this->interpret($response);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function requestRoutes(array $payload, string $key): Response
    {
        $attempt = 0;

        while ($attempt < 2) {
            $attempt++;

            try {
                return Http::withHeaders([
                    'X-Goog-Api-Key' => $key,
                    'X-Goog-FieldMask' => self::FIELD_MASK,
                ])->acceptJson()
                    ->asJson()
                    ->connectTimeout(5)
                    ->timeout(5)
                    ->post(self::ENDPOINT, $payload);
            } catch (ConnectionException $exception) {
                if ($attempt >= 2) {
                    $this->logFailure(0, 'timeout', $exception->getMessage(), '');

                    throw new DeliveryQuoteUnavailableException();
                }
            } catch (\Throwable $exception) {
                $this->logFailure(0, 'unexpected', $exception->getMessage(), '');

                throw new DeliveryQuoteUnavailableException();
            }
        }

        throw new DeliveryQuoteUnavailableException();
    }

    private function interpret(Response $response): string
    {
        $status = $response->status();
        $body = (string) $response->body();
        $json = $response->json();
        $googleStatus = is_array($json) ? (string) data_get($json, 'error.status', '') : '';
        $googleMessage = is_array($json) ? (string) data_get($json, 'error.message', '') : '';

        if ($status === 200 && is_array($json)) {
            if (data_get($json, 'geocodingResults.destination.partialMatch') === true) {
                $this->addressNotFound();
            }

            $routes = $json['routes'] ?? null;

            if (! is_array($routes) || $routes === []) {
                $this->addressNotFound();
            }

            $meters = $routes[0]['distanceMeters'] ?? null;

            if (! is_numeric($meters)) {
                $this->logFailure($status, 'unexpected', 'distanceMeters ausente', $body);

                throw new DeliveryQuoteUnavailableException();
            }

            return $this->metersToKm((int) $meters);
        }

        if ($status === 404 || $googleStatus === 'NOT_FOUND') {
            $this->addressNotFound();
        }

        $this->logFailure($status, $googleStatus !== '' ? $googleStatus : 'http', $googleMessage, $body);

        throw new DeliveryQuoteUnavailableException();
    }

    /**
     * @param  \Illuminate\Support\Collection<int, DeliveryZone>  $zones
     * @return array{distance_km: string, fee_amount: string, delivery_zone_id: int}
     */
    private function matchZone($zones, string $distanceKm): array
    {
        $distanceCents = $this->kmToCents($distanceKm);
        $match = null;
        $maxCents = null;
        $maxLabel = null;

        foreach ($zones as $zone) {
            $radiusCents = $this->kmToCents((string) $zone->radius_km);

            if ($maxCents === null || $radiusCents > $maxCents) {
                $maxCents = $radiusCents;
                $maxLabel = $this->formatKmLabel((string) $zone->radius_km);
            }

            if ($radiusCents >= $distanceCents && ($match === null || $radiusCents < $this->kmToCents((string) $match->radius_km))) {
                $match = $zone;
            }
        }

        if ($match === null) {
            throw ValidationException::withMessages([
                'address' => 'Esse endereço fica fora da nossa área de entrega (atendemos até '.$maxLabel.' km).',
            ]);
        }

        return [
            'distance_km' => $distanceKm,
            'fee_amount' => number_format((float) $match->fee_amount, 2, '.', ''),
            'delivery_zone_id' => (int) $match->id,
        ];
    }

    private function destinationAddress(
        string $street,
        string $number,
        string $neighborhood,
        string $city,
        string $state,
    ): string {
        $parts = [$street];

        if (strtoupper($number) !== 'S/N') {
            $parts[] = $number;
        }

        $parts[] = $neighborhood;

        return implode(', ', $parts).', '.$city.' - '.$state.', Brasil';
    }

    private function cacheKey(string $street, string $number, string $neighborhood): string
    {
        $normalized = implode('|', [
            $this->normalize($street),
            mb_strtoupper($this->normalize($number)),
            $this->normalize($neighborhood),
            $this->normalize((string) config('store.city')),
            $this->normalize((string) config('store.state')),
        ]);

        return 'delivery-quote:'.hash('sha256', $normalized);
    }

    private function normalize(string $value): string
    {
        $value = mb_strtolower(trim($value));

        return preg_replace('/\s+/u', ' ', $value) ?? $value;
    }

    private function metersToKm(int $meters): string
    {
        if ($meters < 0) {
            $meters = 0;
        }

        $centiKm = intdiv($meters + 9, 10);

        return intdiv($centiKm, 100).'.'.str_pad((string) ($centiKm % 100), 2, '0', STR_PAD_LEFT);
    }

    private function kmToCents(string $km): int
    {
        if (preg_match('/^(\d+)(?:\.(\d{1,2}))?$/', $km, $matches) !== 1) {
            throw new DeliveryQuoteUnavailableException();
        }

        return ((int) $matches[1]) * 100 + (int) str_pad($matches[2] ?? '00', 2, '0', STR_PAD_RIGHT);
    }

    private function formatKmLabel(string $km): string
    {
        $formatted = number_format((float) $km, 2, ',', '');
        $formatted = preg_replace('/,00$/', '', $formatted) ?? $formatted;

        return preg_replace('/,(\d)0$/', ',$1', $formatted) ?? $formatted;
    }

    private function addressNotFound(): never
    {
        throw ValidationException::withMessages([
            'address' => 'Não encontramos esse endereço. Confira rua, número e bairro.',
        ]);
    }

    private function logFailure(int $status, string $googleStatus, string $message, string $body): void
    {
        $context = [
            'http_status' => $status,
            'google_status' => $googleStatus,
            'google_message' => $this->redact($message),
            'body' => $this->redact($body),
        ];

        if ($status === 429 || $googleStatus === 'RESOURCE_EXHAUSTED') {
            Log::error('Google Routes API recusou a cotação porque a cota estourou (429).', $context);

            return;
        }

        Log::error('Falha ao calcular a entrega na Google Routes API.', $context);
    }

    private function redact(string $text): string
    {
        $key = config('services.google_maps.key');

        if (is_string($key) && $key !== '') {
            $text = str_replace($key, '[redacted]', $text);
        }

        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;

        return mb_substr(trim($text), 0, 400);
    }
}
