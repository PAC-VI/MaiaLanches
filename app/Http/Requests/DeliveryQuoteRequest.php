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
        $this->replace(DeliveryAddress::normalizeInput(
            $this->all(),
            'street',
            'number',
            'neighborhood',
        ));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return DeliveryAddress::rules('street', 'number', 'neighborhood');
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return DeliveryAddress::messages('street', 'number', 'neighborhood');
    }
}
