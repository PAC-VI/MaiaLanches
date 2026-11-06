<?php

namespace App\Console\Commands;

use App\Models\Order;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class AutoAcceptOrders extends Command
{
    protected $signature = 'orders:auto-accept';

    protected $description = 'Passa para em preparo os pedidos novos que já esperaram o tempo configurado';

    public function handle(): int
    {
        $minutes = (int) config('orders.auto_accept_minutes');
        $cutoff = now()->subMinutes($minutes);

        $ids = Order::query()
            ->where('status', 'novo')
            ->where('created_at', '<=', $cutoff)
            ->orderBy('id')
            ->pluck('id');

        $accepted = 0;

        foreach ($ids as $id) {
            $changed = DB::transaction(function () use ($id) {
                $order = Order::query()->whereKey($id)->lockForUpdate()->first();

                return $order?->autoAccept() === true;
            });

            if ($changed) {
                $accepted++;
            }
        }

        $this->info('Pedidos aceitos: '.$accepted.'.');

        return self::SUCCESS;
    }
}
