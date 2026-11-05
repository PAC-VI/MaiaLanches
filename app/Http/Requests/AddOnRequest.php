<?php

namespace App\Http\Requests;

use App\Rules\SafeText;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AddOnRequest extends FormRequest
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
        $unique = Rule::unique('add_ons', 'name');
        $addOnId = $this->route('addOn')?->id;

        if ($addOnId) {
            $unique->ignore($addOnId);
        }

        return [
            'name' => ['required', 'string', 'max:60', new SafeText(), $unique],
            'price' => ['required', 'numeric', 'min:0', 'max:9999.99', 'decimal:0,2'],
        ];
    }
}
