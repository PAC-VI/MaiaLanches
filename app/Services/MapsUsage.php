<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Contador mensal de chamadas ao Google. Persiste no cache configurado.
 * Se o cache padrão não sobrevive entre requests, usa o store "file".
 */
class MapsUsage
{
    public const AUTOCOMPLETE = 'autocomplete';

    public const DETAILS = 'details';

    public const ROUTES = 'routes';

    public function allows(string $api): bool
    {
        return $this->count($api) < $this->limit($api);
    }

    public function hit(string $api): void
    {
        $key = $this->key($api);
        $store = $this->store();
        $ttl = $this->ttl();

        $store->add($key, 0, $ttl);
        $count = (int) $store->increment($key);
        $limit = $this->limit($api);
        $threshold = (int) ceil($limit * 0.8);

        if ($limit > 0 && $count >= $threshold && $store->add($this->warnKey($api), 1, $ttl)) {
            Log::warning('Uso mensal da API de mapas passou de 80% do limite.', [
                'api' => $api,
                'count' => $count,
                'limit' => $limit,
            ]);
        }
    }

    public function noteBlocked(string $api): void
    {
        if (! $this->store()->add($this->blockedKey($api), 1, $this->ttl())) {
            return;
        }

        Log::warning('Limite mensal da API de mapas atingido; a chamada não foi feita.', [
            'api' => $api,
            'limit' => $this->limit($api),
        ]);
    }

    public function count(string $api): int
    {
        return (int) $this->store()->get($this->key($api), 0);
    }

    private function limit(string $api): int
    {
        $limit = (int) config('services.google_maps.limits.'.$api, 0);

        return max(0, $limit);
    }

    private function key(string $api): string
    {
        return 'maps-usage:'.$api.':'.$this->month();
    }

    private function warnKey(string $api): string
    {
        return 'maps-usage-warn:'.$api.':'.$this->month();
    }

    private function blockedKey(string $api): string
    {
        return 'maps-usage-blocked:'.$api.':'.$this->month();
    }

    private function month(): string
    {
        return now()->timezone((string) config('app.timezone'))->format('Y-m');
    }

    private function ttl(): \DateTimeInterface
    {
        return now()->timezone((string) config('app.timezone'))->endOfMonth()->addDays(2);
    }

    private function store(): \Illuminate\Contracts\Cache\Repository
    {
        $name = (string) config('cache.default');

        if ($name === '' || $name === 'array' || $name === 'null') {
            if (Cache::store('file')->add('maps-usage-fallback-noted', 1, $this->ttl())) {
                Log::warning('CACHE_STORE não persiste entre requests. O contador de mapas usa o cache em arquivo.');
            }

            return Cache::store('file');
        }

        return Cache::store($name);
    }
}
