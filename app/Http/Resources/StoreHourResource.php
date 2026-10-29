<?php

namespace App\Http\Resources;

use DateTimeInterface;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StoreHourResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'weekday' => (int) $this->weekday,
            'is_open_day' => (bool) $this->is_open_day,
            'opens_at' => self::clock($this->opens_at),
            'closes_at' => self::clock($this->closes_at),
        ];
    }

    /**
     * A coluna time volta como "HH:MM:SS". A API fala HH:MM.
     */
    private static function clock(mixed $value): ?string
    {
        if ($value instanceof DateTimeInterface) {
            return $value->format('H:i');
        }

        if (! is_string($value) || $value === '') {
            return null;
        }

        if (! preg_match('/^(\d{2}:\d{2})/', $value, $matches)) {
            return null;
        }

        return $matches[1];
    }
}
