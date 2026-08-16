<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('daily_number');
            $table->string('customer_name');
            $table->string('customer_phone');
            $table->string('type', 20);
            $table->string('status', 20)->default('novo');
            $table->string('payment_method', 20);
            $table->timestamp('order_date')->useCurrent();
            $table->decimal('change_for', 10, 2)->nullable();
            $table->text('delivery_address')->nullable();
            $table->decimal('delivery_fee', 10, 2)->default(0);
            $table->decimal('total_amount', 10, 2);
            $table->boolean('is_printed')->default(false);
            $table->timestamps();

            $table->index('daily_number');
            $table->index('order_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};