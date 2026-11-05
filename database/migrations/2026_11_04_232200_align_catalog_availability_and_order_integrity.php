<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('add_ons', function (Blueprint $table) {
            $table->boolean('is_active')->default(true);
        });

        Schema::table('product_sizes', function (Blueprint $table) {
            $table->boolean('is_active')->default(true);
        });

        Schema::table('delivery_zones', function (Blueprint $table) {
            $table->unique('radius_km');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('orders_order_date_index');
            $table->dropColumn(['customer_cpf', 'order_date']);
            $table->index('created_at');
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['status', 'created_at']);
            $table->dropIndex(['created_at']);
            $table->string('customer_cpf', 11)->nullable();
            $table->timestamp('order_date')->useCurrent();
            $table->index('order_date');
        });

        Schema::table('delivery_zones', function (Blueprint $table) {
            $table->dropUnique(['radius_km']);
        });

        Schema::table('product_sizes', function (Blueprint $table) {
            $table->dropColumn('is_active');
        });

        Schema::table('add_ons', function (Blueprint $table) {
            $table->dropColumn('is_active');
        });
    }
};
