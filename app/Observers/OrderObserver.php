<?php

namespace App\Observers;

use App\Models\Order;
use App\Models\StoreSetting;
use Illuminate\Support\Carbon;

class OrderObserver
{
    /**
     * Antes de salvar um novo pedido, calcula o "daily_number":
     * se a data mudou em relação ao last_number_reset, o contador
     * é zerado para 1; caso contrário, é apenas incrementado.
     *
     * Conforme descrito em "Arquitetura backend.docx".
     */
    public function creating(Order $order): void
    {
        $settings = StoreSetting::current();

        $today = Carbon::today();

        if (! $settings->last_number_reset || ! $settings->last_number_reset->isSameDay($today)) {
            $settings->current_daily_number = 1;
            $settings->last_number_reset = $today;
        } else {
            $settings->current_daily_number += 1;
        }

        $settings->save();

        $order->daily_number = $settings->current_daily_number;
    }
}
