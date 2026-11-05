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
            $input['description'] = SafeText::normalize($input['description'], allowNewlines: true);
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

    /**
     * @return array<int, string>
     */
    protected function priceRules(): array
    {
        return ['required', 'numeric', 'min:0', 'max:9999.99', 'decimal:0,2'];
    }
}
