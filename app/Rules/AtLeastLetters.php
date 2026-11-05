<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class AtLeastLetters implements ValidationRule
{
    public function __construct(private readonly int $min = 2) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $count = preg_match_all('/\p{L}/u', (string) $value);

        if ($count < $this->min) {
            $fail('O nome precisa ter pelo menos '.$this->min.' letras.');
        }
    }
}
