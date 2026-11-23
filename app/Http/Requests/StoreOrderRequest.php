<?php

namespace App\Http\Requests;

use App\Models\Order;
use App\Rules\AtLeastLetters;
use App\Rules\PhoneNumber;
use App\Rules\SafeText;
use App\Support\DeliveryAddress;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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

        $input = DeliveryAddress::normalizeInput(
            $input,
            'delivery_street',
            'delivery_number',
            'delivery_neighborhood',
        );

        if (array_key_exists('delivery_reference', $input)) {
            $input['delivery_reference'] = SafeText::normalize($input['delivery_reference']);
        }

        if (array_key_exists('address_token', $input) && is_string($input['address_token'])) {
            $input['address_token'] = trim($input['address_token']);
        }

        if (($input['address_token'] ?? null) === '') {
            unset($input['address_token']);
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

            'address_token' => [
                'exclude_unless:type,delivery',
                'nullable',
                'string',
                'max:4000',
            ],
            ...DeliveryAddress::rules('delivery_street', 'delivery_number', 'delivery_neighborhood', true, true),
            'delivery_reference' => [
                'exclude_unless:type,delivery',
                'nullable',
                'string',
                'max:80',
                new SafeText(),
            ],
            'items' => ['required', 'array', 'min:1', 'max:30'],
            'items.*.product_size_id' => ['required', 'integer', 'exists:product_sizes,id'],
            'items.*.quantity' => ['required', 'integer', 'between:1,50'],
            'items.*.observation' => ['nullable', 'string', 'max:180', 'regex:/^[\p{L}\p{M}\p{N}\s,.\'º°\/!?()\-]*$/u'],
            'items.*.add_ons' => ['sometimes', 'array', 'max:10'],
            'items.*.add_ons.*.id' => ['required', 'integer', 'exists:add_ons,id'],
            'items.*.add_ons.*.quantity' => ['required', 'integer', 'between:1,10'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $items = $this->input('items');

            if (! is_array($items)) {
                return;
            }

            foreach ($items as $index => $item) {
                if (! is_array($item) || ! is_array($item['add_ons'] ?? null)) {
                    continue;
                }

                $seen = [];

                foreach ($item['add_ons'] as $addonIndex => $addon) {
                    if (! is_array($addon) || ! array_key_exists('id', $addon) || ! is_numeric($addon['id'])) {
                        continue;
                    }

                    $id = (int) $addon['id'];

                    if (isset($seen[$id])) {
                        $validator->errors()->add(
                            "items.$index.add_ons.$addonIndex.id",
                            'Acréscimo repetido no mesmo item.'
                        );

                        continue;
                    }

                    $seen[$id] = true;
                }
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'customer_name.regex' => 'Informe o nome usando apenas letras.',
            ...DeliveryAddress::messages('delivery_street', 'delivery_number', 'delivery_neighborhood'),
            'delivery_reference.max' => 'A referência deve ter no máximo 80 caracteres.',
            'items.*.observation.regex' => 'A observação só pode ter letras, números e pontuação simples.',
            'items.*.add_ons.max' => 'Cada item aceita no máximo 10 acréscimos.',
            'items.*.add_ons.*.id.exists' => 'O acréscimo selecionado não está disponível.',
            'items.*.add_ons.*.quantity.integer' => 'A quantidade de cada acréscimo deve ser um número inteiro.',
            'items.*.add_ons.*.quantity.between' => 'A quantidade de cada acréscimo deve estar entre 1 e 10.',
            'payment_method.required' => 'Escolha uma forma de pagamento.',
            'payment_method.exists' => 'Esta forma de pagamento não está disponível.',
            'change_for.prohibited_unless' => 'O troco só pode ser informado no pagamento em dinheiro.',
        ];
    }
}
