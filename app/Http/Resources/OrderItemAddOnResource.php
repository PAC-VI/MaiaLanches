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
            'id' => $this->id,
            'add_on_id' => $this->add_on_id,
            'name' => $this->whenLoaded('addOn', fn () => $this->addOn->name),
            'price' => (float) $this->price,
        ];
    }
}
