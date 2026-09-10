<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    /**
     * Lista produtos. Aceita os filtros opcionais ?category_id= e
     * ?only_active=1 (este último é útil para montar o cardápio do
     * cliente, que não deve mostrar itens pausados).
     */
    public function index(Request $request)
    {
        $query = Product::query()->with(['category', 'sizes']);

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        if ($request->boolean('only_active')) {
            $query->where('is_active', true);
        }

        $products = $query->orderBy('name')->get();

        return ProductResource::collection($products);
    }

    public function store(StoreProductRequest $request)
    {
        $data = $request->validated();

        $product = DB::transaction(function () use ($data) {
            $product = Product::create([
                'category_id' => $data['category_id'],
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'is_active' => $data['is_active'] ?? true,
            ]);

            foreach ($data['sizes'] as $size) {
                $product->sizes()->create($size);
            }

            return $product;
        });

        return ProductResource::make($product->load(['category', 'sizes']))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Product $product)
    {
        return ProductResource::make($product->load(['category', 'sizes']));
    }

    /**
     * Atualiza um produto. Se "sizes" for enviado, ele substitui a lista
     * completa: tamanhos com "id" são atualizados, sem "id" são criados,
     * e tamanhos que já existiam mas não vieram na lista são removidos.
     */
    public function update(UpdateProductRequest $request, Product $product)
    {
        $data = $request->validated();

        DB::transaction(function () use ($data, $product) {
            $fields = [];

            foreach (['category_id', 'name', 'description', 'is_active'] as $key) {
                if (array_key_exists($key, $data)) {
                    $fields[$key] = $data[$key];
                }
            }

            if ($fields !== []) {
                $product->update($fields);
            }

            if (array_key_exists('sizes', $data)) {
                $sentIds = collect($data['sizes'])->pluck('id')->filter()->all();

                // Remove tamanhos que não vieram mais na lista.
                $product->sizes()->whereNotIn('id', $sentIds)->delete();

                foreach ($data['sizes'] as $size) {
                    if (! empty($size['id'])) {
                        $product->sizes()->where('id', $size['id'])->update([
                            'size_name' => $size['size_name'],
                            'price' => $size['price'],
                        ]);
                    } else {
                        $product->sizes()->create([
                            'size_name' => $size['size_name'],
                            'price' => $size['price'],
                        ]);
                    }
                }
            }
        });

        return ProductResource::make($product->fresh(['category', 'sizes']));
    }

    /**
     * Atenção: a migration de "product_sizes" e "order_items" usa
     * cascadeOnDelete. Excluir um produto remove também seus tamanhos e,
     * em cascata, os itens de pedidos históricos que os referenciam.
     * Para "pausar" a venda de um item, prefira usar PATCH is_active=false.
     */
    public function destroy(Product $product)
    {
        $product->delete();

        return response()->noContent();
    }
}
