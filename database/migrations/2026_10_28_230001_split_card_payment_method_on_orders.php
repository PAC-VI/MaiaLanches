<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * O cartão deixa de ser um código só. Pedidos antigos com "cartao"
     * passam a crédito, que era o significado único até aqui.
     */
    public function up(): void
    {
        DB::table('orders')
            ->where('payment_method', 'cartao')
            ->update(['payment_method' => 'cartao_credito']);

        DB::statement(
            "ALTER TABLE orders MODIFY payment_method VARCHAR(20) NOT NULL COMMENT 'pix | cartao_credito | cartao_debito | dinheiro'"
        );

        DB::statement(
            "ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('pix', 'cartao_credito', 'cartao_debito', 'dinheiro'))"
        );
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE orders DROP CHECK orders_payment_method_check');

        DB::table('orders')
            ->whereIn('payment_method', ['cartao_credito', 'cartao_debito'])
            ->update(['payment_method' => 'cartao']);

        DB::statement(
            "ALTER TABLE orders MODIFY payment_method VARCHAR(20) NOT NULL COMMENT 'dinheiro | cartao | pix'"
        );
    }
};
