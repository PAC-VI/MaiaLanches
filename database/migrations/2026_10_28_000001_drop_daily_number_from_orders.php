<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * O número do pedido passa a ser o próprio id (sequencial, sem reinício).
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('orders_daily_number_index');
            $table->dropColumn('daily_number');
        });

        Schema::table('store_settings', function (Blueprint $table) {
            $table->dropColumn(['current_daily_number', 'last_number_reset']);
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedInteger('daily_number')->default(0);
            $table->index('daily_number');
        });

        Schema::table('store_settings', function (Blueprint $table) {
            $table->unsignedInteger('current_daily_number')->default(0);
            $table->date('last_number_reset')->nullable();
        });
    }
};
