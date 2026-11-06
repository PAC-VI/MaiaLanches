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
            'delivery_street' => $this->delivery_street,
            'delivery_number' => $this->delivery_number,
            'delivery_neighborhood' => $this->delivery_neighborhood,
            'delivery_reference' => $this->delivery_reference,
            'delivery_address' => $this->resource->deliveryAddressLine(),
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

            if ($this->status === 'novo' && $this->created_at !== null) {
                $minutes = max(1, (int) config('orders.auto_accept_minutes'));
                $data['auto_accept_at'] = $this->created_at->copy()->addMinutes($minutes)->toIso8601String();
            }
        }

        return $data;
    }
}
