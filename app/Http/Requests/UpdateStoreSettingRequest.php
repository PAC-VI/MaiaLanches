<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStoreSettingRequest extends FormRequest
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
            'is_open' => ['sometimes', 'boolean'],
            'delivery_time_minutes' => ['sometimes', 'integer', 'between:0,600'],
            'pickup_time_minutes' => ['sometimes', 'integer', 'between:0,600'],
        ];
    }
}
