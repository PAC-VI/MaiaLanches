<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Motoboy extends Model
{
    use SoftDeletes;

    /** @var array<int, string> */
    protected $fillable = [
        'name',
        'phone',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /**
     * Em rota: tem entrega atribuída ainda aberta.
     * Disponível: ativo e sem entrega aberta.
     * Off: inativo, mesmo que ainda tenha pedido antigo.
     */
    public function statusLabel(): string
    {
        if (! $this->is_active) {
            return 'Off';
        }

        if ($this->has_open_delivery) {
            return 'Em rota';
        }

        return 'Disponível';
    }
}
