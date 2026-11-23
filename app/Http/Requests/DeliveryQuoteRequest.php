<?php

namespace App\Http\Requests;

use App\Support\DeliveryAddress;
use Illuminate\Foundation\Http\FormRequest;

class DeliveryQuoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $input = DeliveryAddress::normalizeInput(
            $this->all(),
            'street',
            'number',
            'neighborhood',
        );

        if (array_key_exists('address_token', $input) && is_string($input['address_token'])) {
            $input['address_token'] = trim($input['address_token']);
        }

        if (($input['address_token'] ?? null) === '') {
            unset($input['address_token']);
        }

        $this->replace($input);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'address_token' => ['nullable', 'string', 'max:4000'],
            'street' => array_merge(
                ['exclude_with:address_token'],
                DeliveryAddress::streetRules(),
            ),
            'number' => DeliveryAddress::numberRules(),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            ...DeliveryAddress::messages('street', 'number', 'neighborhood'),
            'address_token.max' => 'Selecione o endereço novamente.',
        ];
    }
}
