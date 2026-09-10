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
}
