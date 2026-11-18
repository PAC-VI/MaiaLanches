<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->unsignedInteger('sort_order')->default(0)->after('name');
            $table->index('sort_order');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->unsignedInteger('sort_order')->default(0)->after('name');
            $table->index(['category_id', 'sort_order']);
        });

        $categoryIds = DB::table('categories')->orderBy('name')->orderBy('id')->pluck('id');

        foreach ($categoryIds as $index => $id) {
            DB::table('categories')->where('id', $id)->update(['sort_order' => $index + 1]);
        }

        $productCategoryIds = DB::table('products')->distinct()->pluck('category_id');

        foreach ($productCategoryIds as $categoryId) {
            $productIds = DB::table('products')
                ->where('category_id', $categoryId)
                ->orderBy('name')
                ->orderBy('id')
                ->pluck('id');

            foreach ($productIds as $index => $id) {
                DB::table('products')->where('id', $id)->update(['sort_order' => $index + 1]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['category_id', 'sort_order']);
            $table->dropColumn('sort_order');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropIndex(['sort_order']);
            $table->dropColumn('sort_order');
        });
    }
};
