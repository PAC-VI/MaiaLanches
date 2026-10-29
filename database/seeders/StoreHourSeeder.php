<?php

namespace Database\Seeders;

use App\Models\StoreHour;
use Illuminate\Database\Seeder;

class StoreHourSeeder extends Seeder
{
    /**
     * Semana do mock da Home: segunda fechada; terça, quarta, quinta e
     * domingo 18:00–23:00; sexta e sábado 18:00–00:00 (vira o dia).
     */
    public function run(): void
    {
        $days = [
            ['weekday' => 0, 'is_open_day' => true, 'opens_at' => '18:00:00', 'closes_at' => '23:00:00'],
            ['weekday' => 1, 'is_open_day' => false, 'opens_at' => null, 'closes_at' => null],
            ['weekday' => 2, 'is_open_day' => true, 'opens_at' => '18:00:00', 'closes_at' => '23:00:00'],
            ['weekday' => 3, 'is_open_day' => true, 'opens_at' => '18:00:00', 'closes_at' => '23:00:00'],
            ['weekday' => 4, 'is_open_day' => true, 'opens_at' => '18:00:00', 'closes_at' => '23:00:00'],
            ['weekday' => 5, 'is_open_day' => true, 'opens_at' => '18:00:00', 'closes_at' => '00:00:00'],
            ['weekday' => 6, 'is_open_day' => true, 'opens_at' => '18:00:00', 'closes_at' => '00:00:00'],
        ];

        foreach ($days as $day) {
            StoreHour::query()->firstOrCreate(
                ['weekday' => $day['weekday']],
                $day
            );
        }
    }
}
