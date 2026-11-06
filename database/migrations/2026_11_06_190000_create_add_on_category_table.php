<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('add_on_category', function (Blueprint $table) {
            $table->foreignId('add_on_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->primary(['add_on_id', 'category_id']);
        });

        // Acréscimos que já existiam passam a valer em todas as categorias.
        $pairs = DB::table('add_ons')
            ->crossJoin('categories')
            ->select('add_ons.id as add_on_id', 'categories.id as category_id')
            ->get();

        foreach ($pairs->chunk(500) as $chunk) {
            DB::table('add_on_category')->insert($chunk->map(fn ($row) => [
                'add_on_id' => $row->add_on_id,
                'category_id' => $row->category_id,
            ])->all());
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('add_on_category');
    }
};
