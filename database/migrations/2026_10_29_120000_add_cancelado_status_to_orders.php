<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * O pedido pode ser cancelado. A coluna continua VARCHAR (como a de
     * pagamento): o conjunto válido fica no CHECK, e cancelled_at marca
     * o momento do cancelamento.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('cancelled_at')->nullable()->after('status');
        });

        DB::statement(
            "ALTER TABLE orders MODIFY status VARCHAR(20) NOT NULL DEFAULT 'novo' COMMENT 'novo | em_preparo | pronto | entregue | cancelado'"
        );

        DB::statement(
            "ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('novo', 'em_preparo', 'pronto', 'entregue', 'cancelado'))"
        );
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE orders DROP CHECK orders_status_check');

        DB::statement(
            "ALTER TABLE orders MODIFY status VARCHAR(20) NOT NULL DEFAULT 'novo'"
        );

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('cancelled_at');
        });
    }
};
