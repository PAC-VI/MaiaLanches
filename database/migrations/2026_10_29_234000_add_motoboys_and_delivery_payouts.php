<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Motoboys, repasse da faixa e o snapshot disso no pedido.
     * delivery_zone_id some se a faixa for excluída; a taxa e o repasse
     * gravados no pedido permanecem.
     */
    public function up(): void
    {
        Schema::create('motoboys', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80);
            $table->string('phone', 20);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::table('delivery_zones', function (Blueprint $table) {
            $table->decimal('motoboy_payout_amount', 10, 2)->default(0)->after('fee_amount');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('delivered_at')->nullable()->after('cancelled_at');
            $table->foreignId('delivery_zone_id')
                ->nullable()
                ->after('delivery_address')
                ->constrained('delivery_zones')
                ->nullOnDelete();
            $table->decimal('motoboy_payout', 10, 2)->default(0)->after('delivery_fee');
            $table->index('delivered_at');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('motoboy_id')
                ->nullable()
                ->after('motoboy_payout')
                ->constrained('motoboys')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['delivered_at']);
            $table->dropConstrainedForeignId('motoboy_id');
            $table->dropConstrainedForeignId('delivery_zone_id');
            $table->dropColumn(['motoboy_payout', 'delivered_at']);
        });

        Schema::table('delivery_zones', function (Blueprint $table) {
            $table->dropColumn('motoboy_payout_amount');
        });

        Schema::dropIfExists('motoboys');
    }
};
