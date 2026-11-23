<?php

namespace App\Support;

use App\Rules\SafeText;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\ValidationException;

class AddressToken
{
    public const TTL_MINUTES = 30;

    public function issue(string $street, string $neighborhood): string
    {
        $payload = json_encode([
            'street' => $street,
            'neighborhood' => $neighborhood,
            'exp' => now()->addMinutes(self::TTL_MINUTES)->getTimestamp(),
        ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

        return Crypt::encryptString($payload);
    }

    /**
     * @return array{street: string, neighborhood: string}
     */
    public function open(string $token): array
    {
        try {
            $decoded = json_decode(Crypt::decryptString($token), true, 8, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            $this->invalid();
        }

        if (! is_array($decoded)) {
            $this->invalid();
        }

        $exp = $decoded['exp'] ?? null;
        $street = $decoded['street'] ?? null;
        $neighborhood = $decoded['neighborhood'] ?? null;

        if (! is_int($exp) || $exp < now()->getTimestamp()) {
            $this->invalid();
        }

        if (! is_string($street) || ! is_string($neighborhood)) {
            $this->invalid();
        }

        $street = SafeText::normalize($street);
        $neighborhood = SafeText::normalize($neighborhood);

        if (! is_string($street) || ! is_string($neighborhood) || ! $this->acceptable($street, 3, 80) || ! $this->acceptable($neighborhood, 2, 60)) {
            $this->invalid();
        }

        return [
            'street' => $street,
            'neighborhood' => $neighborhood,
        ];
    }

    private function acceptable(string $value, int $min, int $max): bool
    {
        $length = mb_strlen($value);

        if ($length < $min || $length > $max) {
            return false;
        }

        $failed = false;
        (new SafeText())->validate('address', $value, function () use (&$failed) {
            $failed = true;
        });

        return ! $failed;
    }

    private function invalid(): never
    {
        throw ValidationException::withMessages([
            'address_token' => 'Selecione o endereço novamente.',
        ]);
    }
}
