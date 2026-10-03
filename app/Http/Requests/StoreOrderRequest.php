<?php

namespace App\Http\Requests;

use App\Models\Order;
use Illuminate\Foundation\Http\FormRequest;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Normaliza o CPF (se enviado) para conter só dígitos, antes de validar.
     * Assim aceitamos tanto "123.456.789-00" quanto "12345678900" do frontend.
     */
    protected function prepareForValidation(): void
    {
        if ($this->filled('customer_cpf')) {
            $this->merge([
                'customer_cpf' => preg_replace('/\D/', '', (string) $this->input('customer_cpf')),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_phone' => ['required', 'string', 'max:20'],
            // Opcional: o cliente não se cadastra nem loga, o CPF é só um
            // dado extra que ele pode informar na hora do pedido. Validamos
            // apenas o formato (11 dígitos), sem checar o dígito verificador.
            'customer_cpf' => ['nullable', 'digits:11'],
            'type' => ['required', 'string', 'in:'.implode(',', Order::TYPES)],
            'payment_method' => ['required', 'string', 'in:'.implode(',', Order::PAYMENT_METHODS)],
            'change_for' => ['nullable', 'numeric', 'min:0'],

            'delivery_address' => ['required_if:type,delivery', 'nullable', 'string'],
            'delivery_fee' => ['required_if:type,delivery', 'nullable', 'numeric', 'min:0'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.product_size_id' => ['required', 'integer', 'exists:product_sizes,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.observation' => ['nullable', 'string'],
            'items.*.add_on_ids' => ['sometimes', 'array'],
            'items.*.add_on_ids.*' => ['integer', 'exists:add_ons,id'],
        ];
    }
}
