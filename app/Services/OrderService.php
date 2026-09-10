<?php

namespace App\Services;

use App\Models\AddOn;
use App\Models\Order;
use App\Models\ProductSize;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderService
{
    /**
     * Cria um pedido completo (cabeçalho + itens + acréscimos) dentro de
     * uma transação, "congelando" os preços de produtos e acréscimos no
     * momento da compra, como descrito no dicionário de dados do projeto.
     *
     * @param  array<string, mixed>  $data  Dados já validados por StoreOrderRequest.
     */
    public function create(array $data): Order
    {
        return DB::transaction(function () use ($data) {
            // Carrega todos os tamanhos de produto pedidos de uma vez, já
            // filtrando produtos pausados (is_active = false).
            $sizeIds = collect($data['items'])->pluck('product_size_id')->unique();

            $sizes = ProductSize::with('product')
                ->whereIn('id', $sizeIds)
                ->get()
                ->keyBy('id');

            foreach ($sizeIds as $sizeId) {
                $size = $sizes->get($sizeId);

                if (! $size || ! $size->product->is_active) {
                    throw ValidationException::withMessages([
                        'items' => "O item selecionado (tamanho #{$sizeId}) não está disponível no momento.",
                    ]);
                }
            }

            // Carrega os acréscimos pedidos de uma vez só.
            $addOnIds = collect($data['items'])
                ->flatMap(fn (array $item) => $item['add_on_ids'] ?? [])
                ->unique();

            $addOns = AddOn::whereIn('id', $addOnIds)->get()->keyBy('id');

            // Calcula o total do pedido a partir dos itens + acréscimos.
            $itemsTotal = 0;

            foreach ($data['items'] as $item) {
                $unitPrice = (float) $sizes->get($item['product_size_id'])->price;
                $itemsTotal += $unitPrice * $item['quantity'];

                foreach ($item['add_on_ids'] ?? [] as $addOnId) {
                    $itemsTotal += (float) $addOns->get($addOnId)->price * $item['quantity'];
                }
            }

            $deliveryFee = $data['type'] === 'delivery' ? (float) ($data['delivery_fee'] ?? 0) : 0;

            // O "daily_number" é atribuído automaticamente pelo OrderObserver.
            $order = Order::create([
                'customer_name' => $data['customer_name'],
                'customer_phone' => $data['customer_phone'],
                'type' => $data['type'],
                'status' => 'novo',
                'payment_method' => $data['payment_method'],
                'change_for' => $data['change_for'] ?? null,
                'delivery_address' => $data['type'] === 'delivery' ? $data['delivery_address'] : null,
                'delivery_fee' => $deliveryFee,
                'total_amount' => $itemsTotal + $deliveryFee,
                'is_printed' => false,
            ]);

            foreach ($data['items'] as $item) {
                $size = $sizes->get($item['product_size_id']);
                $unitPrice = (float) $size->price;

                $orderItem = $order->items()->create([
                    'product_size_id' => $size->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => $unitPrice,
                    'total_price' => $unitPrice * $item['quantity'],
                    'observation' => $item['observation'] ?? null,
                ]);

                foreach ($item['add_on_ids'] ?? [] as $addOnId) {
                    $orderItem->addOns()->create([
                        'add_on_id' => $addOnId,
                        'price' => (float) $addOns->get($addOnId)->price,
                    ]);
                }
            }

            return $order->load(['items.productSize.product', 'items.addOns.addOn']);
        });
    }
}
