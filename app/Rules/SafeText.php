<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Texto livre do admin: letras, números, espaço e pontuação simples.
 * Rejeita < >, controle/invisíveis e espaços repetidos.
 * A normalização (trim e espaços) fica em prepareForValidation via normalize().
 */
class SafeText implements ValidationRule
{
    private const CHARACTERS = '\p{L}\p{M}0-9 .,\'’&()\\/%+:;!?\-_ºª°';

    public function __construct(private readonly bool $allowNewlines = false) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('Use apenas letras, números e pontuação simples.');

            return;
        }

        $withoutBreaks = $this->allowNewlines ? str_replace("\n", '', $value) : $value;

        if (preg_match('/[<>]/', $value) === 1
            || preg_match('/\p{C}/u', $withoutBreaks) === 1
            || preg_match('/ {2,}/', $value) === 1) {
            $fail('Use apenas letras, números e pontuação simples.');

            return;
        }

        $pattern = $this->allowNewlines
            ? '/\A['.self::CHARACTERS.'\n]*\z/u'
            : '/\A['.self::CHARACTERS.']*\z/u';

        if (preg_match($pattern, $value) !== 1) {
            $fail('Use apenas letras, números e pontuação simples.');
        }
    }

    public static function normalize(mixed $value, bool $allowNewlines = false): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        $value = str_replace(["\r\n", "\r"], "\n", $value);

        if (! $allowNewlines) {
            $value = str_replace("\n", ' ', $value);
        }

        $value = preg_replace('/[ \t\x{00A0}]+/u', ' ', $value) ?? $value;

        if ($allowNewlines) {
            $lines = array_map(trim(...), explode("\n", $value));

            return trim(implode("\n", $lines), "\n");
        }

        return trim($value);
    }
}
