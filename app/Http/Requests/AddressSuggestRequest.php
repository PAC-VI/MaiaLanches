<?php

namespace App\Http\Requests;

use App\Rules\SafeText;
use Illuminate\Foundation\Http\FormRequest;

class AddressSuggestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $query = $this->input('q', $this->query('q'));
        $session = $this->input('session_token', $this->query('session_token'));

        $this->merge([
            'q' => is_string($query) ? SafeText::normalize($query) : $query,
            'session_token' => is_string($session) ? strtolower(trim($session)) : $session,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'q' => ['required', 'string', 'min:3', 'max:80', new SafeText()],
            'session_token' => ['required', 'uuid'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'q.required' => 'Digite pelo menos 3 caracteres.',
            'q.min' => 'Digite pelo menos 3 caracteres.',
            'q.max' => 'A rua deve ter no máximo 80 caracteres.',
            'session_token.required' => 'Não foi possível buscar endereços. Tente de novo.',
            'session_token.uuid' => 'Não foi possível buscar endereços. Tente de novo.',
        ];
    }
}
