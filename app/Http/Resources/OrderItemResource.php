<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_size_id' => $this->product_size_id,
            'product_name' => $this->whenLoaded('productSize', fn () => $this->productSize->product->name),
            'size_name' => $this->whenLoaded('productSize', fn () => $this->productSize->size_name),
            'quantity' => $this->quantity,
            'unit_price' => (float) $this->unit_price,
            'total_price' => (float) $this->total_price,
            'observation' => $this->observation,
            'add_ons' => OrderItemAddOnResource::collection($this->whenLoaded('addOns')),
        ];
    }
}
