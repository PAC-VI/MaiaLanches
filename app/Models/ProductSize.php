<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductSize extends Model
{
    /** @var array<int, string> */
    protected $fillable = ['product_id', 'size_name', 'price', 'is_active'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * can_delete da listagem: um exists, sem consulta por tamanho.
     */
    public function scopeWithSalesFlag($query)
    {
        return $query->withExists('orderItems as has_sales');
    }

    public function hasSales(): bool
    {
        if (array_key_exists('has_sales', $this->attributes)) {
            return (int) $this->attributes['has_sales'] === 1;
        }

        return $this->orderItems()->exists();
    }
}
