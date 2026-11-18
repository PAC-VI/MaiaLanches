<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderItemAddOnResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'name' => $this->whenLoaded('addOn', fn () => $this->addOn?->name),
            'quantity' => (int) ($this->quantity ?? 1),
            'unit_price' => (float) $this->price,
        ];
    }
}
