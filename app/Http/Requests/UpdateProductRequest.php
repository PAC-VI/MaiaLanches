<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesProductPayload;
use App\Rules\SafeText;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProductRequest extends FormRequest
{
    use ValidatesProductPayload;

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
            'name' => ['sometimes', 'required', 'string', 'max:80', new SafeText()],
            'description' => ['nullable', 'string', 'max:500', new SafeText(allowNewlines: true)],
            'is_active' => ['sometimes', 'boolean'],

            // Se "sizes" for enviado, ele substitui a lista completa de tamanhos:
            // itens com "id" são atualizados, sem "id" são criados, e os que
            // já existiam no produto mas não vierem na lista são removidos.
            // Tamanho que já teve venda não pode sair: o controller responde 422.
            'sizes' => ['sometimes', 'array', 'min:1', 'max:10'],
            'sizes.*.id' => ['nullable', 'integer', 'exists:product_sizes,id'],
            'sizes.*.size_name' => ['required', 'string', 'max:40', new SafeText()],
            'sizes.*.price' => $this->priceRules(),
        ];
    }
}
