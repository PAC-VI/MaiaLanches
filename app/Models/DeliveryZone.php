<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeliveryZone extends Model
{
    /** @var array<int, string> */
    protected $fillable = ['radius_km', 'fee_amount'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'radius_km' => 'decimal:2',
            'fee_amount' => 'decimal:2',
        ];
    }
}
