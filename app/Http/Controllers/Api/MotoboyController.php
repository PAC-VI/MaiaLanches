<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MotoboyResource;
use App\Models\Motoboy;
use App\Models\Order;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class MotoboyController extends Controller
{
    public function index()
    {
        return MotoboyResource::collection(
            $this->withStatus()->orderBy('name')->orderBy('id')->get()
        );
    }

    public function store(Request $request)
    {
        $motoboy = Motoboy::create($this->validated($request));

        return (new MotoboyResource($this->withStatus()->findOrFail($motoboy->id)))
            ->response()
            ->setStatusCode(201);
    }

    public function update(Request $request, Motoboy $motoboy)
    {
        $motoboy->update($this->validated($request));

        return new MotoboyResource($this->withStatus()->findOrFail($motoboy->id));
    }

    public function destroy(Motoboy $motoboy)
    {
        $motoboy->delete();

        return response()->noContent();
    }

    /**
     * Desempenho de um dia da loja. Sem ?date=, vale hoje.
     * Entregas e repasse contam pedidos entregues com delivered_at nesse dia.
     * A lista traz essas entregas e, se o dia for hoje, as entregas ainda abertas.
     */
    public function summary(Request $request, Motoboy $motoboy)
    {
        $timezone = config('app.timezone');
        $today = CarbonImmutable::now($timezone)->toDateString();
        $dateInput = $request->query('date', $today);

        $validated = validator(
            ['date' => is_string($dateInput) ? $dateInput : ''],
            ['date' => ['required', 'date_format:Y-m-d']],
            [
                'date.required' => 'Informe a data.',
                'date.date_format' => 'A data está em formato inválido.',
            ],
        )->validate();

        $day = CarbonImmutable::parse($validated['date'], $timezone)->startOfDay();
        $end = $day->addDay();
        $isToday = $validated['date'] === $today;

        $delivered = Order::query()
            ->where('motoboy_id', $motoboy->id)
            ->where('type', 'delivery')
            ->where('status', 'entregue')
            ->where('delivered_at', '>=', $day->toDateTimeString())
            ->where('delivered_at', '<', $end->toDateTimeString());

        $deliveriesCount = (clone $delivered)->count();
        $payoutTotal = round((float) (clone $delivered)->sum('motoboy_payout'), 2);
        $average = $deliveriesCount > 0 ? round($payoutTotal / $deliveriesCount, 2) : 0.0;

        $orders = Order::query()
            ->where('motoboy_id', $motoboy->id)
            ->where('type', 'delivery')
            ->where('status', '!=', Order::STATUS_CANCELLED)
            ->where(function (Builder $query) use ($day, $end, $isToday) {
                $query->where(function (Builder $deliveredOnDay) use ($day, $end) {
                    $deliveredOnDay->where('status', 'entregue')
                        ->where('delivered_at', '>=', $day->toDateTimeString())
                        ->where('delivered_at', '<', $end->toDateTimeString());
                });

                if ($isToday) {
                    $query->orWhere(function (Builder $open) {
                        $open->whereNotIn('status', ['entregue', Order::STATUS_CANCELLED]);
                    });
                }
            })
            ->orderByRaw("CASE WHEN status = 'entregue' THEN 1 ELSE 0 END")
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'date' => $validated['date'],
            'deliveries_count' => $deliveriesCount,
            'payout_total' => $payoutTotal,
            'average_per_delivery' => $average,
            'orders' => $orders->map(fn (Order $order) => [
                'id' => $order->id,
                'customer_name' => $order->customer_name,
                'address_summary' => $this->summarizeAddress($order->delivery_address),
                'delivery_fee' => (float) $order->delivery_fee,
                'status' => $order->status,
            ])->values(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        $request->merge([
            'name' => trim((string) $request->input('name')),
            'phone' => trim((string) $request->input('phone')),
        ]);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:80', 'regex:/^[\p{L}\p{M}][\p{L}\p{M}\s\'.\-]*$/u'],
            'phone' => ['required', 'string', 'regex:/^\(\d{2}\) \d{4,5}-\d{4}$/'],
            'is_active' => ['required', 'boolean'],
        ], [
            'name.required' => 'Informe o nome do motoboy.',
            'name.max' => 'O nome pode ter no máximo 80 caracteres.',
            'name.regex' => 'Informe o nome usando apenas letras.',
            'phone.required' => 'Informe o telefone do motoboy.',
            'phone.regex' => 'Informe o telefone no formato (XX) XXXXX-XXXX.',
            'is_active.required' => 'Informe se o motoboy está ativo.',
            'is_active.boolean' => 'Informe se o motoboy está ativo.',
        ]);

        return $data;
    }

    private function withStatus(): Builder
    {
        return Motoboy::query()->withExists([
            'orders as has_open_delivery' => function (Builder $query) {
                $query->where('type', 'delivery')
                    ->whereNotIn('status', ['entregue', Order::STATUS_CANCELLED]);
            },
        ]);
    }

    private function summarizeAddress(?string $address): string
    {
        $text = trim((string) preg_replace('/\s+/u', ' ', (string) $address));

        if ($text === '') {
            return '';
        }

        $parts = array_values(array_filter(
            array_map('trim', explode(',', $text)),
            fn (string $part) => $part !== ''
        ));

        if (count($parts) >= 2) {
            $text = $parts[0].', '.$parts[1];
        }

        if (mb_strlen($text) <= 48) {
            return $text;
        }

        return rtrim(mb_substr($text, 0, 47)).'…';
    }
}
