<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Product extends Model
{
    /** @var array<int, string> */
    protected $fillable = ['category_id', 'name', 'description', 'is_active'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * Variações de tamanho/preço deste produto (ex: P, M, G).
     */
    public function sizes(): HasMany
    {
        return $this->hasMany(ProductSize::class);
    }

    /**
     * Itens de pedido que compraram algum tamanho deste produto.
     */
    public function orderItems(): HasManyThrough
    {
        return $this->hasManyThrough(OrderItem::class, ProductSize::class);
    }

    /**
     * can_delete da listagem: um exists, sem consulta por produto.
     */
    public function scopeWithSalesFlag($query)
    {
        return $query->withExists('orderItems as has_sales');
    }

    public function scopeWithCatalogRelations($query)
    {
        return $query->withSalesFlag()->with([
            'sizes',
            'category' => function ($categoryQuery) {
                $categoryQuery->withSalesFlag();
            },
        ]);
    }

    public function hasSales(): bool
    {
        if (array_key_exists('has_sales', $this->attributes)) {
            return (int) $this->attributes['has_sales'] === 1;
        }

        return $this->orderItems()->exists();
    }
}
