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
        Schema::table('orders', function (Blueprint $table) {
            // CPF é opcional (o cliente não faz cadastro nem login).
            // Guardado somente com dígitos (sem pontos/traço) para facilitar
            // busca e validação; ver StoreOrderRequest.
            $table->string('customer_cpf', 11)->nullable()->after('customer_phone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('customer_cpf');
        });
    }
};
