<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductRequest extends FormRequest
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
            'category_id' => ['sometimes', 'required', 'integer', 'exists:categories,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],

            // Se "sizes" for enviado, ele substitui a lista completa de tamanhos:
            // itens com "id" são atualizados, sem "id" são criados, e os que
            // já existiam no produto mas não vierem na lista são removidos.
            'sizes' => ['sometimes', 'array', 'min:1'],
            'sizes.*.id' => ['nullable', 'integer', 'exists:product_sizes,id'],
            'sizes.*.size_name' => ['required', 'string', 'max:100'],
            'sizes.*.price' => ['required', 'numeric', 'min:0'],
        ];
    }
}
