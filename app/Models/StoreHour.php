<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Um dia da semana no horário informado ao cliente.
 *
 * weekday: 0 = domingo … 6 = sábado.
 * closes_at anterior a opens_at atravessa a meia-noite (ex.: 18:00–00:00).
 * Estes campos não mandam na loja: o toggle manual grava store_settings.is_open.
 */
class StoreHour extends Model
{
    /** @var array<int, string> */
    protected $fillable = [
        'weekday',
        'is_open_day',
        'opens_at',
        'closes_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'weekday' => 'integer',
            'is_open_day' => 'boolean',
        ];
    }
}
