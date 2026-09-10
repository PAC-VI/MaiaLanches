<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    public const TYPES = ['delivery', 'pickup'];

    public const STATUSES = ['novo', 'em_preparo', 'saiu_entrega', 'concluido'];

    public const PAYMENT_METHODS = ['dinheiro', 'cartao', 'pix'];

    /** @var array<int, string> */
    protected $fillable = [
        'customer_name',
        'customer_phone',
        'type',
        'status',
        'payment_method',
        'change_for',
        'delivery_address',
        'delivery_fee',
        'total_amount',
        'is_printed',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'change_for' => 'decimal:2',
            'delivery_fee' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'is_printed' => 'boolean',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
