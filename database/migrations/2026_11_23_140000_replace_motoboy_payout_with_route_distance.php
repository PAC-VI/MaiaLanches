<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * O repasse do motoboy passa a ser a própria taxa do pedido.
     * A distância da rota fica gravada como snapshot.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('distance_km', 8, 2)->nullable()->after('delivery_fee');
            $table->dropColumn('motoboy_payout');
        });

        Schema::table('delivery_zones', function (Blueprint $table) {
            $table->dropColumn('motoboy_payout_amount');
        });
    }

    public function down(): void
    {
        Schema::table('delivery_zones', function (Blueprint $table) {
            $table->decimal('motoboy_payout_amount', 10, 2)->default(0)->after('fee_amount');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('distance_km');
            $table->decimal('motoboy_payout', 10, 2)->default(0)->after('delivery_fee');
        });
    }
};
