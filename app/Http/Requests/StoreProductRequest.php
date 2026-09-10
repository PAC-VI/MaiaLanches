<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
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
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],

            'sizes' => ['required', 'array', 'min:1'],
            'sizes.*.size_name' => ['required', 'string', 'max:100'],
            'sizes.*.price' => ['required', 'numeric', 'min:0'],
        ];
    }
}
