<?php

namespace App\Support;

use App\Rules\SafeText;

/**
 * Regras do endereço de entrega, compartilhadas pelo pedido e pela cotação.
 */
class DeliveryAddress
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public static function rules(
        string $street,
        string $number,
        string $neighborhood,
        bool $onlyForDelivery = false,
        bool $optionalWithAddressToken = false,
    ): array {
        $streetRules = self::streetRules();
        $numberRules = self::numberRules();
        $neighborhoodRules = self::neighborhoodRules();

        if ($optionalWithAddressToken) {
            array_unshift($streetRules, 'exclude_with:address_token');
            array_unshift($neighborhoodRules, 'exclude_with:address_token');
        }

        if ($onlyForDelivery) {
            array_unshift($streetRules, 'exclude_unless:type,delivery');
            array_unshift($numberRules, 'exclude_unless:type,delivery');
            array_unshift($neighborhoodRules, 'exclude_unless:type,delivery');
        }

        return [
            $street => $streetRules,
            $number => $numberRules,
            $neighborhood => $neighborhoodRules,
        ];
    }

    /**
     * @return array<int, mixed>
     */
    public static function streetRules(): array
    {
        return ['required', 'string', 'min:3', 'max:80', new SafeText()];
    }

    /**
     * @return array<int, mixed>
     */
    public static function numberRules(): array
    {
        return ['required', 'string', 'max:10', 'regex:/^(S\/N|\d+[A-Z]?)$/'];
    }

    /**
     * @return array<int, mixed>
     */
    public static function neighborhoodRules(): array
    {
        return ['required', 'string', 'min:2', 'max:60', new SafeText()];
    }

    /**
     * @return array<string, string>
     */
    public static function messages(string $street, string $number, string $neighborhood): array
    {
        return [
            $street.'.required' => 'Informe a rua.',
            $street.'.min' => 'A rua deve ter pelo menos 3 caracteres.',
            $number.'.required' => 'Informe o número.',
            $number.'.regex' => 'Informe o número (ex.: 123, 123A) ou S/N.',
            $neighborhood.'.required' => 'Informe o bairro.',
            $neighborhood.'.min' => 'O bairro deve ter pelo menos 2 caracteres.',
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public static function normalizeInput(
        array $input,
        string $street,
        string $number,
        string $neighborhood,
    ): array {
        foreach ([$street, $neighborhood] as $field) {
            if (array_key_exists($field, $input)) {
                $input[$field] = SafeText::normalize($input[$field]);
            }
        }

        if (array_key_exists($number, $input) && is_string($input[$number])) {
            $input[$number] = strtoupper(preg_replace('/\s+/u', '', $input[$number]) ?? '');
        }

        return $input;
    }
}
