<?php

namespace App\Http\Requests\Concerns;

use App\Rules\SafeText;
use Illuminate\Validation\Validator;

trait ValidatesProductPayload
{
    protected function prepareForValidation(): void
    {
        $input = $this->all();

        if (array_key_exists('name', $input)) {
            $input['name'] = SafeText::normalize($input['name']);
        }

        if (array_key_exists('description', $input)) {
            $input['description'] = $this->normalizeDescription($input['description']);
        }

        if (isset($input['sizes']) && is_array($input['sizes'])) {
            foreach ($input['sizes'] as $index => $size) {
                if (! is_array($size) || ! array_key_exists('size_name', $size)) {
                    continue;
                }

                $input['sizes'][$index]['size_name'] = SafeText::normalize($size['size_name']);
            }
        }

        $this->replace($input);
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $sizes = $this->input('sizes');

            if (! is_array($sizes)) {
                return;
            }

            $seen = [];

            foreach ($sizes as $index => $size) {
                if (! is_array($size)) {
                    continue;
                }

                $name = mb_strtolower(trim((string) ($size['size_name'] ?? '')));

                if ($name === '') {
                    continue;
                }

                if (isset($seen[$name])) {
                    $validator->errors()->add(
                        "sizes.$index.size_name",
                        'Este nome de tamanho já foi usado neste produto.'
                    );
                }

                $seen[$name] = true;
            }
        });
    }

    private function normalizeDescription(mixed $value): mixed
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (! is_string($value)) {
            return $value;
        }

        $normalized = SafeText::normalize($value, allowNewlines: true);

        if (! is_string($normalized) || $normalized === '') {
            return null;
        }

        $normalized = preg_replace("/\n{3,}/", "\n\n", $normalized) ?? $normalized;

        if (mb_strlen($normalized) > 500) {
            $normalized = rtrim(mb_substr($normalized, 0, 500), " \t");
        }

        return $normalized === '' ? null : $normalized;
    }

    /**
     * @return array<int, string>
     */
    protected function priceRules(): array
    {
        return ['required', 'numeric', 'min:0', 'max:9999.99', 'decimal:0,2'];
    }
}
