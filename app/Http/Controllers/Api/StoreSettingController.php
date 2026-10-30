<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StoreSetting;
use Illuminate\Http\Request;

class StoreSettingController extends Controller
{
    public function show()
    {
        return $this->payload(StoreSetting::current());
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'is_open' => ['sometimes', 'boolean'],
            'delivery_time_minutes' => ['sometimes', 'integer', 'min:0'],
            'pickup_time_minutes' => ['sometimes', 'integer', 'min:0'],
        ]);

        $settings = StoreSetting::current();
        $settings->update($data);

        return $this->payload($settings);
    }

    /**
     * Descrição, endereço e contato vêm de config/store.php (env),
     * não da tabela. O painel não edita esses três campos.
     *
     * @return array<string, mixed>
     */
    private function payload(StoreSetting $settings): array
    {
        return [
            'is_open' => (bool) $settings->is_open,
            'delivery_time_minutes' => (int) $settings->delivery_time_minutes,
            'pickup_time_minutes' => (int) $settings->pickup_time_minutes,
            'description' => (string) config('store.description'),
            'address' => (string) config('store.address'),
            'contact' => (string) config('store.contact'),
        ];
    }
}
