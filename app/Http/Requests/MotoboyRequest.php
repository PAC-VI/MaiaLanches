<?php

namespace App\Http\Requests;

use App\Rules\PhoneNumber;
use App\Rules\SafeText;
use Illuminate\Foundation\Http\FormRequest;

class MotoboyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $input = [];

        if ($this->exists('name')) {
            $input['name'] = SafeText::normalize($this->input('name'));
        }

        if ($this->exists('phone')) {
            $input['phone'] = PhoneNumber::normalize($this->input('phone'));
        }

        if ($input !== []) {
            $this->merge($input);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:80', new SafeText()],
            'phone' => ['required', 'string', new PhoneNumber()],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
