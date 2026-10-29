<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pedido antigo não pode sumir porque um tamanho ou acréscimo foi apagado.
     * RESTRICT impede o cascade que levava o histórico junto.
     */
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropForeign(['product_size_id']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->foreign('product_size_id')
                ->references('id')
                ->on('product_sizes')
                ->restrictOnDelete();
        });

        Schema::table('order_item_add_ons', function (Blueprint $table) {
            $table->dropForeign(['add_on_id']);
        });

        Schema::table('order_item_add_ons', function (Blueprint $table) {
            $table->foreign('add_on_id')
                ->references('id')
                ->on('add_ons')
                ->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropForeign(['product_size_id']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->foreign('product_size_id')
                ->references('id')
                ->on('product_sizes')
                ->cascadeOnDelete();
        });

        Schema::table('order_item_add_ons', function (Blueprint $table) {
            $table->dropForeign(['add_on_id']);
        });

        Schema::table('order_item_add_ons', function (Blueprint $table) {
            $table->foreign('add_on_id')
                ->references('id')
                ->on('add_ons')
                ->cascadeOnDelete();
        });
    }
};
