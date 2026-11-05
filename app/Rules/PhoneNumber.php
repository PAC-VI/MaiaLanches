<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Espelha isPhoneNumber do front: DDD de 11 a 99.
 * 10 dígitos (fixo) ou 11 dígitos começando com 9 (celular).
 */
class PhoneNumber implements ValidationRule
{
    public const MESSAGE = 'Informe um telefone com DDD de 11 a 99. No celular, use 11 dígitos começando com 9.';

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $digits = preg_replace('/\D/', '', (string) $value) ?? '';

        if (strlen($digits) !== 10 && strlen($digits) !== 11) {
            $fail(self::MESSAGE);

            return;
        }

        $ddd = (int) substr($digits, 0, 2);

        if ($ddd < 11 || $ddd > 99) {
            $fail(self::MESSAGE);

            return;
        }

        if (strlen($digits) === 11 && $digits[2] !== '9') {
            $fail(self::MESSAGE);
        }
    }

    public static function normalize(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        $digits = preg_replace('/\D/', '', $value) ?? '';

        if (strlen($digits) === 10) {
            return sprintf('(%s) %s-%s', substr($digits, 0, 2), substr($digits, 2, 4), substr($digits, 6, 4));
        }

        if (strlen($digits) === 11) {
            return sprintf('(%s) %s-%s', substr($digits, 0, 2), substr($digits, 2, 5), substr($digits, 7, 4));
        }

        return trim($value);
    }
}
