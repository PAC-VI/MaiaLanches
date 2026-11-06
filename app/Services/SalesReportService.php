<?php

namespace App\Services;

use App\Models\Order;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Agregados de venda para o painel. Não devolve pedido nem dado pessoal.
 *
 * created_at é TIMESTAMP. A conexão MySQL usa time_zone -03:00
 * (config/database.php), o mesmo offset de APP_TIMEZONE o ano inteiro.
 * O Laravel grava o horário já nesse fuso, então DATE(created_at) e os
 * limites >= início do dia e < o dia seguinte são o dia da loja.
 *
 * Cancelados não entram em faturamento, ticket, taxas, entregas,
 * retiradas, série nem contagem de venda. Ficam só em cancelled_count.
 */
class SalesReportService
{
    /** @var array<string, string> */
    private const STATUS_COLUMNS = [
        'novo' => 'status_novo',
        'em_preparo' => 'status_em_preparo',
        'pronto' => 'status_pronto',
        'entregue' => 'status_entregue',
    ];

    /** @var array<string, string> */
    private const PAYMENT_COLUMNS = [
        'pix' => 'pay_pix',
        'cartao_credito' => 'pay_cartao_credito',
        'cartao_debito' => 'pay_cartao_debito',
        'dinheiro' => 'pay_dinheiro',
    ];

    /**
     * @return array<string, mixed>
     */
    public function build(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $timezone = config('app.timezone');
        $today = CarbonImmutable::now($timezone)->startOfDay();

        return DB::transaction(function () use ($from, $to, $today) {
            $period = $this->metrics($from, $to, true);
            $period['series'] = $this->series($from, $to);

            $previousTo = $from->subDay();
            $previousFrom = $previousTo->subDays((int) $from->diff($to)->days);

            return [
                'period' => $period,
                'previous_period' => $this->metrics($previousFrom, $previousTo, false),
                'windows' => [
                    'today' => $this->window($today, 1),
                    'previous_today' => $this->previousWindow($today, 1),
                    'days_7' => $this->window($today, 7),
                    'previous_days_7' => $this->previousWindow($today, 7),
                    'days_30' => $this->window($today, 30),
                    'previous_days_30' => $this->previousWindow($today, 30),
                ],
            ];
        });
    }

    /**
     * Faturamento e quantidade, o bastante para a variação percentual.
     *
     * @return array<string, mixed>
     */
    private function window(CarbonImmutable $today, int $days): array
    {
        return $this->variation($today->subDays($days - 1), $today);
    }

    /**
     * @return array<string, mixed>
     */
    private function previousWindow(CarbonImmutable $today, int $days): array
    {
        return $this->variation(
            $today->subDays(2 * $days - 1),
            $today->subDays($days),
        );
    }

    /**
     * @return array{from: string, to: string, days: int, revenue: float, orders_count: int}
     */
    private function variation(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $metrics = $this->metrics($from, $to, false);

        return [
            'from' => $metrics['from'],
            'to' => $metrics['to'],
            'days' => $metrics['days'],
            'revenue' => $metrics['revenue'],
            'orders_count' => $metrics['orders_count'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function metrics(CarbonImmutable $from, CarbonImmutable $to, bool $detailed): array
    {
        $cancelled = Order::STATUS_CANCELLED;
        $select = [
            'COALESCE(SUM(CASE WHEN status <> ? THEN ROUND(total_amount * 100) ELSE 0 END), 0) AS revenue_cents',
            'COALESCE(SUM(CASE WHEN status <> ? THEN 1 ELSE 0 END), 0) AS orders_count',
            'COALESCE(SUM(CASE WHEN status <> ? THEN ROUND(delivery_fee * 100) ELSE 0 END), 0) AS delivery_fees_cents',
            'COALESCE(SUM(CASE WHEN status <> ? AND type = ? THEN 1 ELSE 0 END), 0) AS delivery_count',
            'COALESCE(SUM(CASE WHEN status <> ? AND type = ? THEN 1 ELSE 0 END), 0) AS pickup_count',
        ];
        $bindings = [
            $cancelled,
            $cancelled,
            $cancelled,
            $cancelled,
            'delivery',
            $cancelled,
            'pickup',
        ];

        if ($detailed) {
            foreach (self::STATUS_COLUMNS as $status => $column) {
                $select[] = "COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS {$column}";
                $bindings[] = $status;
            }

            $select[] = 'COALESCE(SUM(CASE WHEN status = ? THEN 1 ELSE 0 END), 0) AS cancelled_count';
            $bindings[] = $cancelled;

            $select[] = 'COALESCE(SUM(CASE WHEN status IN (?, ?, ?) THEN 1 ELSE 0 END), 0) AS open_count';
            array_push($bindings, ...Order::OPEN_STATUSES);

            foreach (self::PAYMENT_COLUMNS as $method => $column) {
                $select[] = "COALESCE(SUM(CASE WHEN status <> ? AND payment_method = ? THEN ROUND(total_amount * 100) ELSE 0 END), 0) AS {$column}";
                $bindings[] = $cancelled;
                $bindings[] = $method;
            }
        }

        $row = DB::table('orders')
            ->where('created_at', '>=', $from->toDateTimeString())
            ->where('created_at', '<', $to->addDay()->toDateTimeString())
            ->selectRaw(implode(",\n", $select), $bindings)
            ->first();

        $revenueCents = $this->cents($row->revenue_cents ?? 0);
        $ordersCount = $this->cents($row->orders_count ?? 0);

        $payload = [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'days' => (int) $from->diff($to)->days + 1,
            'revenue' => $this->reais($revenueCents),
            'orders_count' => $ordersCount,
            'average_ticket' => $ordersCount > 0
                ? $this->reais((int) round($revenueCents / $ordersCount))
                : null,
            'delivery_fees' => $this->reais($this->cents($row->delivery_fees_cents ?? 0)),
            'delivery_count' => $this->cents($row->delivery_count ?? 0),
            'pickup_count' => $this->cents($row->pickup_count ?? 0),
        ];

        if (! $detailed) {
            return $payload;
        }

        $byStatus = [];
        foreach (self::STATUS_COLUMNS as $status => $column) {
            $byStatus[$status] = $this->cents($row->{$column} ?? 0);
        }

        $byPayment = [];
        foreach (self::PAYMENT_COLUMNS as $method => $column) {
            $byPayment[$method] = $this->reais($this->cents($row->{$column} ?? 0));
        }

        $payload['open_count'] = $this->cents($row->open_count ?? 0);
        $payload['cancelled_count'] = $this->cents($row->cancelled_count ?? 0);
        $payload['by_status'] = $byStatus;
        $payload['by_payment_method'] = $byPayment;

        return $payload;
    }

    /**
     * Um ponto por dia do período, inclusive os dias sem venda.
     *
     * @return array<int, array{date: string, revenue: float, orders_count: int}>
     */
    private function series(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $rows = DB::table('orders')
            ->where('created_at', '>=', $from->toDateTimeString())
            ->where('created_at', '<', $to->addDay()->toDateTimeString())
            ->where('status', '<>', Order::STATUS_CANCELLED)
            ->selectRaw(
                'DATE(created_at) AS sale_date,
                 COALESCE(SUM(ROUND(total_amount * 100)), 0) AS revenue_cents,
                 COUNT(*) AS orders_count'
            )
            ->groupByRaw('DATE(created_at)')
            ->get();

        $byDay = [];
        foreach ($rows as $row) {
            $byDay[substr((string) $row->sale_date, 0, 10)] = $row;
        }

        $series = [];
        for ($day = $from; $day->lessThanOrEqualTo($to); $day = $day->addDay()) {
            $key = $day->toDateString();
            $row = $byDay[$key] ?? null;
            $series[] = [
                'date' => $key,
                'revenue' => $this->reais($this->cents($row->revenue_cents ?? 0)),
                'orders_count' => $this->cents($row->orders_count ?? 0),
            ];
        }

        return $series;
    }

    private function cents(mixed $value): int
    {
        return (int) round((float) $value);
    }

    private function reais(int $cents): float
    {
        return $cents / 100;
    }
}
