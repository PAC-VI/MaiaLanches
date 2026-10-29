<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    /** @var array<int, string> */
    protected $fillable = ['name'];

    /**
     * Produtos que pertencem a esta categoria.
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /**
     * can_delete da listagem: um exists, sem consulta por categoria.
     */
    public function scopeWithSalesFlag($query)
    {
        return $query->withExists([
            'products as has_sales' => function ($query) {
                $query->whereHas('orderItems');
            },
        ]);
    }

    public function hasSales(): bool
    {
        if (array_key_exists('has_sales', $this->attributes)) {
            return (int) $this->attributes['has_sales'] === 1;
        }

        return $this->products()->whereHas('orderItems')->exists();
    }
}
