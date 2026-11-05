<?php

namespace App\Http\Requests;

use App\Models\Order;
use App\Rules\AtLeastLetters;
use App\Rules\PhoneNumber;
use App\Rules\SafeText;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $input = $this->all();

        if (array_key_exists('customer_name', $input)) {
            $input['customer_name'] = SafeText::normalize($input['customer_name']);
        }

        if (array_key_exists('customer_phone', $input)) {
            $input['customer_phone'] = PhoneNumber::normalize($input['customer_phone']);
        }

        foreach (['delivery_street', 'delivery_neighborhood', 'delivery_reference'] as $field) {
            if (array_key_exists($field, $input)) {
                $input[$field] = SafeText::normalize($input[$field]);
            }
        }

        if (array_key_exists('delivery_number', $input) && is_string($input['delivery_number'])) {
            $number = strtoupper(preg_replace('/\s+/u', '', $input['delivery_number']) ?? '');
            $input['delivery_number'] = $number;
        }

        if (isset($input['items']) && is_array($input['items'])) {
            foreach ($input['items'] as $index => $item) {
                if (! is_array($item) || ! array_key_exists('observation', $item)) {
                    continue;
                }

                $input['items'][$index]['observation'] = SafeText::normalize($item['observation']);
            }
        }

        $this->replace($input);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'customer_name' => [
                'required',
                'string',
                'min:2',
                'max:80',
                'regex:/^[\p{L}\p{M}][\p{L}\p{M}\s\'.\-]*$/u',
                new AtLeastLetters(2),
            ],
            'customer_phone' => ['required', 'string', new PhoneNumber()],
            'type' => ['required', 'string', 'in:'.implode(',', Order::TYPES)],
            'payment_method' => [
                'required',
                'string',
                Rule::exists('payment_methods', 'code')->where('is_active', true),
            ],
            'change_for' => [
                'nullable',
                'prohibited_unless:payment_method,dinheiro',
                'numeric',
                'min:0',
                'max:9999.99',
                'decimal:0,2',
            ],

            'delivery_street' => [
                'exclude_unless:type,delivery',
                'required',
                'string',
                'min:3',
                'max:80',
                new SafeText(),
            ],
            'delivery_number' => [
                'exclude_unless:type,delivery',
                'required',
                'string',
                'max:10',
                'regex:/^(S\/N|\d+[A-Z]?)$/',
            ],
            'delivery_neighborhood' => [
                'exclude_unless:type,delivery',
                'required',
                'string',
                'min:2',
                'max:60',
                new SafeText(),
            ],
            'delivery_reference' => [
                'exclude_unless:type,delivery',
                'nullable',
                'string',
                'max:80',
                new SafeText(),
            ],
            'delivery_zone_id' => ['required_if:type,delivery', 'nullable', 'integer'],

            'items' => ['required', 'array', 'min:1', 'max:30'],
            'items.*.product_size_id' => ['required', 'integer', 'exists:product_sizes,id'],
            'items.*.quantity' => ['required', 'integer', 'between:1,50'],
            'items.*.observation' => ['nullable', 'string', 'max:180', 'regex:/^[\p{L}\p{M}\p{N}\s,.\'º°\/!?()\-]*$/u'],
            'items.*.add_on_ids' => ['sometimes', 'array', 'max:10'],
            'items.*.add_on_ids.*' => ['integer', 'distinct', 'exists:add_ons,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'customer_name.regex' => 'Informe o nome usando apenas letras.',
            'delivery_street.required' => 'Informe a rua.',
            'delivery_street.min' => 'A rua deve ter pelo menos 3 caracteres.',
            'delivery_number.required' => 'Informe o número.',
            'delivery_number.regex' => 'Informe o número (ex.: 123, 123A) ou S/N.',
            'delivery_neighborhood.required' => 'Informe o bairro.',
            'delivery_neighborhood.min' => 'O bairro deve ter pelo menos 2 caracteres.',
            'delivery_reference.max' => 'A referência deve ter no máximo 80 caracteres.',
            'items.*.observation.regex' => 'A observação só pode ter letras, números e pontuação simples.',
            'payment_method.required' => 'Escolha uma forma de pagamento.',
            'payment_method.exists' => 'Esta forma de pagamento não está disponível.',
            'change_for.prohibited_unless' => 'O troco só pode ser informado no pagamento em dinheiro.',
            'delivery_zone_id.required_if' => 'Selecione uma região de entrega.',
            'delivery_zone_id.integer' => 'Selecione uma região de entrega válida.',
        ];
    }
}
