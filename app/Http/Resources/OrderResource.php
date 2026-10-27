<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'daily_number' => $this->daily_number,
            'customer_name' => $this->customer_name,
            'customer_phone' => $this->customer_phone,
            'type' => $this->type,
            'status' => $this->status,
            'payment_method' => $this->payment_method,
            'change_for' => $this->change_for !== null ? (float) $this->change_for : null,
            'delivery_address' => $this->delivery_address,
            'delivery_fee' => (float) $this->delivery_fee,
            'total_amount' => (float) $this->total_amount,
            'is_printed' => (bool) $this->is_printed,
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
