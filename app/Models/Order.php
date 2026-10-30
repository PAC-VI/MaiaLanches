<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    public const TYPES = ['delivery', 'pickup'];

    public const STATUS_CANCELLED = 'cancelado';

    public const OPEN_STATUSES = ['novo', 'em_preparo', 'pronto'];

    public const STATUSES = ['novo', 'em_preparo', 'pronto', 'entregue', 'cancelado'];

    public const PAYMENT_METHODS = ['pix', 'cartao_credito', 'cartao_debito', 'dinheiro'];

    /** @var array<int, string> */
    protected $fillable = [
        'customer_name',
        'customer_phone',
        'customer_cpf',
        'access_token',
        'type',
        'status',
        'cancelled_at',
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
            'cancelled_at' => 'datetime',
        ];
    }

    public function canMoveTo(string $status): bool
    {
        $allowed = match ($this->status) {
            'novo' => ['em_preparo', self::STATUS_CANCELLED],
            'em_preparo' => ['pronto', self::STATUS_CANCELLED],
            'pronto' => ['entregue', self::STATUS_CANCELLED],
            default => [],
        };

        return in_array($status, $allowed, true);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
