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
        $data = [
            'id' => $this->id,
            'number' => $this->id,
            'customer_name' => $this->customer_name,
            'customer_phone' => $this->customer_phone,
            'type' => $this->type,
            'status' => $this->status,
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'payment_method' => $this->payment_method,
            'change_for' => $this->change_for !== null ? (float) $this->change_for : null,
            'delivery_address' => $this->delivery_address,
            'delivery_zone_id' => $this->delivery_zone_id,
            'delivery_fee' => (float) $this->delivery_fee,
            'total_amount' => (float) $this->total_amount,
            'is_printed' => (bool) $this->is_printed,
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];

        if ($request->user() !== null) {
            $data['motoboy_id'] = $this->motoboy_id;
            $data['motoboy_name'] = $this->relationLoaded('motoboy') ? $this->motoboy?->name : null;
            $data['motoboy_payout'] = (float) $this->motoboy_payout;
            $data['delivered_at'] = $this->delivered_at?->toIso8601String();
        }

        return $data;
    }
}
