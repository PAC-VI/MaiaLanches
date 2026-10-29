<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductController extends Controller
{
    private const SOLD_ITEM_MESSAGE = 'Este item já teve vendas e não pode ser excluído. Desative-o para manter o histórico.';

    private const SOLD_SIZE_MESSAGE = 'Este tamanho já teve vendas e não pode ser removido.';

    /**
     * Lista produtos. Aceita os filtros opcionais ?category_id= e
     * ?only_active=1 (este último é útil para montar o cardápio do
     * cliente, que não deve mostrar itens pausados).
     */
    public function index(Request $request)
    {
        $query = Product::query()->withCatalogRelations();

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

        return $this->resource($product)
            ->response()
            ->setStatusCode(201);
    }

    public function show(Product $product)
    {
        return $this->resource($product);
    }

    /**
     * Atualiza um produto. Se "sizes" for enviado, ele substitui a lista
     * completa: tamanhos com "id" são atualizados, sem "id" são criados,
     * e tamanhos que já existiam mas não vieram na lista são removidos.
     * Tamanho que já teve venda não é removido: a resposta é 422.
     */
    public function update(UpdateProductRequest $request, Product $product)
    {
        $data = $request->validated();

        try {
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
                    $this->syncSizes($product, $data['sizes']);
                }
            });
        } catch (QueryException $exception) {
            $this->throwIfDeleteRestricted($exception, 'sizes', self::SOLD_SIZE_MESSAGE);
        }

        return $this->resource($product);
    }

    /**
     * Exclui só produto que nunca entrou em um pedido. Com venda, 422:
     * o histórico fica, e a loja desativa o item.
     */
    public function destroy(Product $product)
    {
        if ($product->hasSales()) {
            throw ValidationException::withMessages([
                'item' => self::SOLD_ITEM_MESSAGE,
            ]);
        }

        try {
            $product->delete();
        } catch (QueryException $exception) {
            $this->throwIfDeleteRestricted($exception, 'item', self::SOLD_ITEM_MESSAGE);
        }

        return response()->noContent();
    }

    /**
     * Atalho dedicado para o admin marcar um produto como disponível ou
     * indisponível ("acabou o insumo"), sem precisar reenviar o produto
     * inteiro (nome, descrição, tamanhos) como o PUT /products/{id} exige.
     */
    public function updateAvailability(Request $request, Product $product)
    {
        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $product->update($data);

        return $this->resource($product);
    }

    /**
     * @param  array<int, array<string, mixed>>  $sizes
     */
    private function syncSizes(Product $product, array $sizes): void
    {
        $sentIds = collect($sizes)->pluck('id')->filter()->map(fn ($id) => (int) $id);
        $existingIds = $product->sizes()->pluck('id');
        $removedIds = $existingIds->diff($sentIds)->values();

        if ($removedIds->isNotEmpty()
            && OrderItem::query()->whereIn('product_size_id', $removedIds)->exists()) {
            throw ValidationException::withMessages([
                'sizes' => self::SOLD_SIZE_MESSAGE,
            ]);
        }

        if ($removedIds->isNotEmpty()) {
            $product->sizes()->whereIn('id', $removedIds)->delete();
        }

        foreach ($sizes as $size) {
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

    private function resource(Product $product): ProductResource
    {
        return ProductResource::make(
            Product::query()->withCatalogRelations()->findOrFail($product->id)
        );
    }

    private function throwIfDeleteRestricted(QueryException $exception, string $field, string $message): never
    {
        if ((int) ($exception->errorInfo[1] ?? 0) !== 1451) {
            throw $exception;
        }

        throw ValidationException::withMessages([
            $field => $message,
        ]);
    }
}
