<?php

namespace App\Services;

use App\Models\AddOn;
use App\Models\DeliveryZone;
use App\Models\Order;
use App\Models\ProductSize;
use App\Models\StoreSetting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
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
        if (! StoreSetting::current()->is_open) {
            throw ValidationException::withMessages([
                'store' => 'A loja está fechada no momento.',
            ]);
        }

        $zone = $this->resolveDeliveryZone($data);

        return DB::transaction(function () use ($data, $zone) {
            // Carrega todos os tamanhos de produto pedidos de uma vez, já
            // filtrando produtos pausados (is_active = false).
            $sizeIds = collect($data['items'])->pluck('product_size_id')->unique();

            $sizes = ProductSize::with('product')
                ->whereIn('id', $sizeIds)
                ->get()
                ->keyBy('id');

            foreach ($sizeIds as $sizeId) {
                $size = $sizes->get($sizeId);

                if (! $size || ! $size->is_active || ! $size->product->is_active) {
                    throw ValidationException::withMessages([
                        'items' => 'O tamanho selecionado não está disponível no momento.',
                    ]);
                }
            }

            // Carrega os acréscimos pedidos de uma vez só.
            $addOnIds = collect($data['items'])
                ->flatMap(fn (array $item) => $item['add_on_ids'] ?? [])
                ->unique();

            $addOns = AddOn::with('categories')->whereIn('id', $addOnIds)->get()->keyBy('id');

            // Tudo em centavos inteiros. total_price do item é só o produto
            // (unitário × quantidade). Acréscimo fica na linha dele, também
            // unitário. Soma dos itens + acréscimos × quantidade + taxa = total.
            $lines = [];
            $itemsCents = 0;

            foreach ($data['items'] as $item) {
                $quantity = (int) $item['quantity'];
                $unitCents = $this->toCents($sizes->get($item['product_size_id'])->price);
                $lineCents = $unitCents * $quantity;
                $addonLines = [];

                foreach ($item['add_on_ids'] ?? [] as $addOnId) {
                    $addOn = $addOns->get($addOnId);

                    if (! $addOn || ! $addOn->is_active) {
                        throw ValidationException::withMessages([
                            'items' => 'O acréscimo selecionado não está disponível no momento.',
                        ]);
                    }

                    $categoryId = (int) $sizes->get($item['product_size_id'])->product->category_id;
                    $allowed = $addOn->categories->contains(
                        fn ($category) => (int) $category->id === $categoryId
                    );

                    if (! $allowed) {
                        throw ValidationException::withMessages([
                            'items' => "O acréscimo {$addOn->name} não pertence à categoria deste produto.",
                        ]);
                    }

                    $addonCents = $this->toCents($addOn->price);
                    $addonLines[] = [
                        'id' => (int) $addOnId,
                        'cents' => $addonCents,
                    ];
                    $itemsCents += $addonCents * $quantity;
                }

                $itemsCents += $lineCents;
                $lines[] = [
                    'size_id' => (int) $sizes->get($item['product_size_id'])->id,
                    'quantity' => $quantity,
                    'unit_cents' => $unitCents,
                    'line_cents' => $lineCents,
                    'observation' => $item['observation'] ?? null,
                    'addons' => $addonLines,
                ];
            }

            $feeCents = $zone ? $this->toCents($zone->fee_amount) : 0;
            $payoutCents = $zone ? $this->toCents($zone->motoboy_payout_amount) : 0;
            $totalCents = $itemsCents + $feeCents;

            if (($data['payment_method'] ?? null) === 'dinheiro'
                && array_key_exists('change_for', $data)
                && $data['change_for'] !== null) {
                $changeCents = $this->toCents($data['change_for']);

                if ($changeCents < $totalCents) {
                    throw ValidationException::withMessages([
                        'change_for' => 'O troco precisa ser maior ou igual ao total do pedido.',
                    ]);
                }
            }

            $order = Order::create([
                'customer_name' => $data['customer_name'],
                'customer_phone' => $data['customer_phone'],
                // Token de acesso do pedido: é o que o cliente vai usar depois
                // para consultar o status (ver OrderController::statusByTokens).
                // Só é devolvido na resposta desta criação — nunca aparece em
                // nenhuma listagem.
                'access_token' => Str::random(40),
                'type' => $data['type'],
                'status' => 'novo',
                'payment_method' => $data['payment_method'],
                'change_for' => isset($data['change_for']) && $data['change_for'] !== null
                    ? $this->fromCents($this->toCents($data['change_for']))
                    : null,
                'delivery_street' => $data['type'] === 'delivery' ? $data['delivery_street'] : null,
                'delivery_number' => $data['type'] === 'delivery' ? $data['delivery_number'] : null,
                'delivery_neighborhood' => $data['type'] === 'delivery' ? $data['delivery_neighborhood'] : null,
                'delivery_reference' => $data['type'] === 'delivery' ? ($data['delivery_reference'] ?? null) : null,
                'delivery_zone_id' => $zone?->id,
                'delivery_fee' => $this->fromCents($feeCents),
                'motoboy_payout' => $this->fromCents($payoutCents),
                'total_amount' => $this->fromCents($totalCents),
                'is_printed' => false,
            ]);

            foreach ($lines as $line) {
                $orderItem = $order->items()->create([
                    'product_size_id' => $line['size_id'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $this->fromCents($line['unit_cents']),
                    'total_price' => $this->fromCents($line['line_cents']),
                    'observation' => $line['observation'],
                ]);

                foreach ($line['addons'] as $addon) {
                    $orderItem->addOns()->create([
                        'add_on_id' => $addon['id'],
                        'price' => $this->fromCents($addon['cents']),
                    ]);
                }
            }

            return $order->load(['items.productSize.product', 'items.addOns.addOn']);
        });
    }

    private function toCents(mixed $amount): int
    {
        if ($amount === null || $amount === '') {
            return 0;
        }

        if (is_int($amount)) {
            return $amount * 100;
        }

        if (is_float($amount)) {
            $amount = number_format($amount, 2, '.', '');
        }

        $amount = trim((string) $amount);

        if (preg_match('/^(-)?(\d+)(?:\.(\d{1,2}))?$/', $amount, $matches) !== 1) {
            throw ValidationException::withMessages([
                'items' => 'Não foi possível calcular o total do pedido.',
            ]);
        }

        $cents = ((int) $matches[2]) * 100 + (int) str_pad($matches[3] ?? '0', 2, '0', STR_PAD_RIGHT);

        return ($matches[1] ?? '') === '-' ? -$cents : $cents;
    }

    private function fromCents(int $cents): string
    {
        $sign = $cents < 0 ? '-' : '';
        $cents = abs($cents);

        return $sign.intdiv($cents, 100).'.'.str_pad((string) ($cents % 100), 2, '0', STR_PAD_LEFT);
    }

    /**
     * Resolve a faixa usada no pedido. Hoje ela vem escolhida pelo cliente
     * (delivery_zone_id). A taxa e o repasse saem daqui — o cliente não
     * envia esses valores. No futuro este método pode escolher a faixa
     * pela distância, sem mudar quem chama.
     */
    private function resolveDeliveryZone(array $data): ?DeliveryZone
    {
        if (($data['type'] ?? null) !== 'delivery') {
            return null;
        }

        $zoneId = $data['delivery_zone_id'] ?? null;
        $zone = is_numeric($zoneId)
            ? DeliveryZone::query()->find((int) $zoneId)
            : null;

        if (! $zone) {
            throw ValidationException::withMessages([
                'delivery_zone_id' => 'Selecione uma região de entrega válida.',
            ]);
        }

        return $zone;
    }
}
