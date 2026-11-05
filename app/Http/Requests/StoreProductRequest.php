<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesProductPayload;
use App\Rules\SafeText;
use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
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
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:80', new SafeText()],
            'description' => ['nullable', 'string', 'max:500', new SafeText(allowNewlines: true)],
            'is_active' => ['sometimes', 'boolean'],

            'sizes' => ['required', 'array', 'min:1', 'max:10'],
            'sizes.*.size_name' => ['required', 'string', 'max:40', new SafeText()],
            'sizes.*.price' => $this->priceRules(),
        ];
    }
}
