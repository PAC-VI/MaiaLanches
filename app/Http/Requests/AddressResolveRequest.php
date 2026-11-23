<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AddressResolveRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $placeId = $this->input('place_id');
        $session = $this->input('session_token');

        $this->merge([
            'place_id' => is_string($placeId) ? trim($placeId) : $placeId,
            'session_token' => is_string($session) ? strtolower(trim($session)) : $session,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'place_id' => ['required', 'string', 'max:300', 'regex:/^[A-Za-z0-9_\-:]+$/'],
            'session_token' => ['required', 'uuid'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'place_id.required' => 'Selecione o endereço novamente.',
            'place_id.regex' => 'Selecione o endereço novamente.',
            'place_id.max' => 'Selecione o endereço novamente.',
            'session_token.required' => 'Selecione o endereço novamente.',
            'session_token.uuid' => 'Selecione o endereço novamente.',
        ];
    }
}
