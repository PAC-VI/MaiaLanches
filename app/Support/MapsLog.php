<?php

namespace App\Support;

use Illuminate\Support\Facades\Log;

class MapsLog
{
    public static function error(string $message, int $status, string $googleStatus, string $googleMessage, string $body): void
    {
        Log::error($message, [
            'http_status' => $status,
            'google_status' => $googleStatus,
            'google_message' => self::redact($googleMessage),
            'body' => self::redact($body),
        ]);
    }

    public static function redact(string $text): string
    {
        $key = config('services.google_maps.key');

        if (is_string($key) && $key !== '') {
            $text = str_replace($key, '[redacted]', $text);
        }

        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;

        return mb_substr(trim($text), 0, 400);
    }
}
