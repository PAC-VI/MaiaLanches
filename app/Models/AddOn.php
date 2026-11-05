<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AddOn extends Model
{
    /** @var array<int, string> */
    protected $fillable = ['name', 'price', 'is_active'];

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

    public function orderItemAddOns(): HasMany
    {
        return $this->hasMany(OrderItemAddOn::class);
    }

    /**
     * can_delete da listagem: um exists, sem consulta por acréscimo.
     */
    public function scopeWithSalesFlag($query)
    {
        return $query->withExists('orderItemAddOns as has_sales');
    }

    public function hasSales(): bool
    {
        if (array_key_exists('has_sales', $this->attributes)) {
            return (int) $this->attributes['has_sales'] === 1;
        }

        return $this->orderItemAddOns()->exists();
    }
}
