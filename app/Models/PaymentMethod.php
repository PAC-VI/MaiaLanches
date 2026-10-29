<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentMethod extends Model
{
    public const CODES = ['pix', 'cartao_credito', 'cartao_debito', 'dinheiro'];

    /** @var array<int, string> */
    protected $fillable = [
        'code',
        'label',
        'is_active',
        'sort_order',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
