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
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_phone' => ['required', 'string', 'max:20'],
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
