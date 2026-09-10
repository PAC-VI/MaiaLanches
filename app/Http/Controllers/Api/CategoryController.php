<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index()
    {
        return CategoryResource::collection(
            Category::query()->orderBy('name')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:categories,name'],
        ]);

        $category = Category::create($data);

        return CategoryResource::make($category)
            ->response()
            ->setStatusCode(201);
    }

    public function show(Category $category)
    {
        return CategoryResource::make($category);
    }

    public function update(Request $request, Category $category)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:categories,name,'.$category->id],
        ]);

        $category->update($data);

        return CategoryResource::make($category);
    }

    /**
     * Atenção: a migration desta categoria remove em cascata (cascadeOnDelete)
     * todos os produtos vinculados a ela. Prefira desativar produtos
     * individualmente (is_active = false) em vez de excluir a categoria
     * inteira quando ela já tiver produtos cadastrados.
     */
    public function destroy(Category $category)
    {
        $category->delete();

        return response()->noContent();
    }
}
