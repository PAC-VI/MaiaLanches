<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_item_add_ons', function (Blueprint $table) {
            $table->unsignedSmallInteger('quantity')->default(1)->after('add_on_id');
        });

        DB::table('order_item_add_ons')->whereNull('quantity')->update(['quantity' => 1]);
    }

    public function down(): void
    {
        Schema::table('order_item_add_ons', function (Blueprint $table) {
            $table->dropColumn('quantity');
        });
    }
};
