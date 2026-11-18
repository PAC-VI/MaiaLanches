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

        $bacon = AddOn::query()->firstOrCreate(['name' => 'Bacon Extra'], ['price' => 4.00]);
        $cheddar = AddOn::query()->firstOrCreate(['name' => 'Cheddar Extra'], ['price' => 3.50]);
        $ovo = AddOn::query()->firstOrCreate(['name' => 'Ovo'], ['price' => 2.50]);

        $burguers = Category::query()->firstOrCreate(['name' => 'X-Burguers'], ['sort_order' => 1]);
        $dogs = Category::query()->firstOrCreate(['name' => 'Dogs'], ['sort_order' => 2]);
        $porcoes = Category::query()->firstOrCreate(['name' => 'Porções'], ['sort_order' => 3]);

        // Banco novo: cada acréscimo só entra onde combina. Bacon é de hambúrguer.
        $bacon->categories()->sync([$burguers->id]);
        $cheddar->categories()->sync([$burguers->id, $porcoes->id]);
        $ovo->categories()->sync([$burguers->id, $dogs->id]);

        $xBacon = Product::query()->firstOrCreate(
            ['category_id' => $burguers->id, 'name' => 'X-Bacon'],
            ['description' => 'Pão, hambúrguer, queijo, bacon e maionese da casa.', 'is_active' => true, 'sort_order' => 1]
        );
        $xBacon->sizes()->firstOrCreate(['size_name' => 'Único'], ['price' => 22.90]);

        $dogFrango = Product::query()->firstOrCreate(
            ['category_id' => $dogs->id, 'name' => 'Dog Frango'],
            ['description' => 'Pão, salsicha, frango desfiado, milho e ervilha.', 'is_active' => true, 'sort_order' => 1]
        );
        $dogFrango->sizes()->firstOrCreate(['size_name' => 'Único'], ['price' => 14.90]);

        $batataFrita = Product::query()->firstOrCreate(
            ['category_id' => $porcoes->id, 'name' => 'Batata Frita'],
            ['description' => 'Porção de batata frita crocante.', 'is_active' => true, 'sort_order' => 1]
        );
        $batataFrita->sizes()->firstOrCreate(['size_name' => 'P'], ['price' => 12.00]);
        $batataFrita->sizes()->firstOrCreate(['size_name' => 'G'], ['price' => 20.00]);
    }
}
