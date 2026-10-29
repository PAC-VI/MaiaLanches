<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CategoryController extends Controller
{
    private const SOLD_ITEM_MESSAGE = 'Este item já teve vendas e não pode ser excluído. Desative-o para manter o histórico.';

    public function index()
    {
        return CategoryResource::collection(
            Category::query()->withSalesFlag()->orderBy('name')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:categories,name'],
        ]);

        $category = Category::create($data);

        return $this->resource($category)
            ->response()
            ->setStatusCode(201);
    }

    public function show(Category $category)
    {
        return $this->resource($category);
    }

    public function update(Request $request, Category $category)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:categories,name,'.$category->id],
        ]);

        $category->update($data);

        return $this->resource($category);
    }

    /**
     * Liga ou desliga todos os produtos da categoria de uma vez.
     */
    public function updateAvailability(Request $request, Category $category)
    {
        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        DB::transaction(function () use ($category, $data) {
            $category->products()->update([
                'is_active' => $data['is_active'],
            ]);
        });

        return $this->resource($category);
    }

    /**
     * Exclui a categoria e os produtos dela só quando nenhum teve venda.
     * Com venda, 422: desative os produtos para manter o histórico.
     */
    public function destroy(Category $category)
    {
        if ($category->hasSales()) {
            throw ValidationException::withMessages([
                'item' => self::SOLD_ITEM_MESSAGE,
            ]);
        }

        try {
            DB::transaction(function () use ($category) {
                $category->products()->delete();
                $category->delete();
            });
        } catch (QueryException $exception) {
            $this->throwIfDeleteRestricted($exception);
        }

        return response()->noContent();
    }

    private function resource(Category $category): CategoryResource
    {
        return CategoryResource::make(
            Category::query()->withSalesFlag()->findOrFail($category->id)
        );
    }

    private function throwIfDeleteRestricted(QueryException $exception): never
    {
        if ((int) ($exception->errorInfo[1] ?? 0) !== 1451) {
            throw $exception;
        }

        throw ValidationException::withMessages([
            'item' => self::SOLD_ITEM_MESSAGE,
        ]);
    }
}
