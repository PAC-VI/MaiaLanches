<?php

namespace App\Http\Requests;

use App\Rules\SafeText;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePaymentMethodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->exists('label')) {
            $this->merge([
                'label' => SafeText::normalize($this->input('label')),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'label' => ['sometimes', 'required', 'string', 'max:40', new SafeText()],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
