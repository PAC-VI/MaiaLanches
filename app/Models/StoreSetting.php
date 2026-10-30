<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Tabela de linha única com as configurações gerais da lanchonete.
 */
class StoreSetting extends Model
{
    /** @var array<int, string> */
    protected $fillable = [
        'is_open',
        'delivery_time_minutes',
        'pickup_time_minutes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_open' => 'boolean',
        ];
    }

    /**
     * Retorna a linha única de configurações, criando-a com valores
     * padrão caso ainda não exista (primeira execução da aplicação).
     */
    public static function current(): self
    {
        return static::query()->firstOrCreate([], [
            'is_open' => false,
            'delivery_time_minutes' => 30,
            'pickup_time_minutes' => 15,
        ]);
    }
}
