<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
}
