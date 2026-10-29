<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Horário informativo de cada dia. Não abre nem fecha a loja:
     * isso continua em store_settings.is_open, sem agendador.
     *
     * closes_at anterior a opens_at significa que o expediente atravessa
     * a meia-noite (ex.: abre 18:00 e fecha 00:00).
     */
    public function up(): void
    {
        Schema::create('store_hours', function (Blueprint $table) {
            $table->id();
            $table->unsignedTinyInteger('weekday')->unique();
            $table->boolean('is_open_day')->default(false);
            $table->time('opens_at')->nullable();
            $table->time('closes_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_hours');
    }
};
