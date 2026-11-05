<?php

namespace App\Http\Requests;

use App\Rules\SafeText;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->exists('name')) {
            $this->merge([
                'name' => SafeText::normalize($this->input('name')),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $unique = Rule::unique('categories', 'name');
        $categoryId = $this->route('category')?->id;

        if ($categoryId) {
            $unique->ignore($categoryId);
        }

        return [
            'name' => ['required', 'string', 'max:60', new SafeText(), $unique],
        ];
    }
}
