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
        Schema::create('store_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('is_open')->default(false);
            $table->unsignedInteger('delivery_time_minutes')->default(0);
            $table->unsignedInteger('pickup_time_minutes')->default(0);
            $table->unsignedInteger('current_daily_number')->default(0);
            $table->date('last_number_reset')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('store_settings');
    }
};