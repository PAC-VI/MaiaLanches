<?php

namespace Database\Seeders;

use App\Models\AddOn;
use App\Models\Category;
use App\Models\DeliveryZone;
use App\Models\Product;
use App\Models\StoreSetting;
use Illuminate\Database\Seeder;

class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        StoreSetting::current()->update([
            'is_open' => true,
            'delivery_time_minutes' => 40,
            'pickup_time_minutes' => 15,
        ]);

        DeliveryZone::query()->firstOrCreate(['radius_km' => 2.0], ['fee_amount' => 5.00]);
        DeliveryZone::query()->firstOrCreate(['radius_km' => 3.5], ['fee_amount' => 8.00]);

        AddOn::query()->firstOrCreate(['name' => 'Bacon Extra'], ['price' => 4.00]);
        AddOn::query()->firstOrCreate(['name' => 'Cheddar Extra'], ['price' => 3.50]);
        AddOn::query()->firstOrCreate(['name' => 'Ovo'], ['price' => 2.50]);

        $burguers = Category::query()->firstOrCreate(['name' => 'X-Burguers']);
        $dogs = Category::query()->firstOrCreate(['name' => 'Dogs']);
        $porcoes = Category::query()->firstOrCreate(['name' => 'Porções']);

        $xBacon = Product::query()->firstOrCreate(
            ['category_id' => $burguers->id, 'name' => 'X-Bacon'],
            ['description' => 'Pão, hambúrguer, queijo, bacon e maionese da casa.', 'is_active' => true]
        );
        $xBacon->sizes()->firstOrCreate(['size_name' => 'Único'], ['price' => 22.90]);

        $dogFrango = Product::query()->firstOrCreate(
            ['category_id' => $dogs->id, 'name' => 'Dog Frango'],
            ['description' => 'Pão, salsicha, frango desfiado, milho e ervilha.', 'is_active' => true]
        );
        $dogFrango->sizes()->firstOrCreate(['size_name' => 'Único'], ['price' => 14.90]);

        $batataFrita = Product::query()->firstOrCreate(
            ['category_id' => $porcoes->id, 'name' => 'Batata Frita'],
            ['description' => 'Porção de batata frita crocante.', 'is_active' => true]
        );
        $batataFrita->sizes()->firstOrCreate(['size_name' => 'P'], ['price' => 12.00]);
        $batataFrita->sizes()->firstOrCreate(['size_name' => 'G'], ['price' => 20.00]);
    }
}
