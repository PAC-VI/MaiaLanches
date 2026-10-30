<?php

namespace Database\Seeders;

use App\Models\PaymentMethod;
use Illuminate\Database\Seeder;

class PaymentMethodSeeder extends Seeder
{
    public function run(): void
    {
        $methods = [
            ['code' => 'pix', 'label' => 'Pix', 'sort_order' => 1],
            ['code' => 'cartao_credito', 'label' => 'Cartão de crédito', 'sort_order' => 2],
            ['code' => 'cartao_debito', 'label' => 'Cartão de débito', 'sort_order' => 3],
            ['code' => 'dinheiro', 'label' => 'Dinheiro', 'sort_order' => 4],
        ];

        foreach ($methods as $method) {
            PaymentMethod::query()->firstOrCreate(
                ['code' => $method['code']],
                [
                    'label' => $method['label'],
                    'is_active' => true,
                    'sort_order' => $method['sort_order'],
                ]
            );
        }
    }
}
