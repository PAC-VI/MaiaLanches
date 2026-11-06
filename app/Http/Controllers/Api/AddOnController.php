<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddOnRequest;
use App\Http\Resources\AddOnResource;
use App\Models\AddOn;
use App\Models\OrderItemAddOn;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AddOnController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'only_active' => ['sometimes', 'boolean'],
        ]);

        $query = AddOn::query()->with('categories')->withSalesFlag()->orderBy('name');

        if ($request->boolean('only_active')) {
            $query->where('is_active', true);
        }

        return AddOnResource::collection($query->get());
    }

    public function store(AddOnRequest $request)
    {
        $categoryIds = $request->validated('category_ids');
        $data = collect($request->validated())->except('category_ids')->all();

        $addOn = DB::transaction(function () use ($data, $categoryIds) {
            $addOn = AddOn::query()->create($data);
            $addOn->categories()->sync($categoryIds);

            return $addOn;
        });

        return $this->resource($addOn)
            ->response()
            ->setStatusCode(201);
    }

    public function show(AddOn $addOn)
    {
        return $this->resource($addOn);
    }

    public function update(AddOnRequest $request, AddOn $addOn)
    {
        $categoryIds = $request->validated('category_ids');
        $data = collect($request->validated())->except('category_ids')->all();

        DB::transaction(function () use ($addOn, $data, $categoryIds) {
            $addOn->update($data);
            $addOn->categories()->sync($categoryIds);
        });

        return $this->resource($addOn);
    }

    public function updateAvailability(Request $request, AddOn $addOn)
    {
        $data = $request->validate([
            'is_active' => ['required', 'boolean'],
        ], [
            'is_active.required' => 'Informe se o acréscimo está ativo.',
            'is_active.boolean' => 'Informe se o acréscimo está ativo.',
        ]);

        $addOn->update($data);

        return $this->resource($addOn);
    }

    public function destroy(AddOn $addOn)
    {
        if (OrderItemAddOn::query()->where('add_on_id', $addOn->id)->exists()) {
            throw ValidationException::withMessages([
                'add_on' => 'Este acréscimo já teve vendas e não pode ser excluído, para manter o histórico dos pedidos.',
            ]);
        }

        try {
            $addOn->delete();
        } catch (QueryException $exception) {
            if ((int) ($exception->errorInfo[1] ?? 0) !== 1451) {
                throw $exception;
            }

            throw ValidationException::withMessages([
                'add_on' => 'Este acréscimo já teve vendas e não pode ser excluído, para manter o histórico dos pedidos.',
            ]);
        }

        return response()->noContent();
    }

    private function resource(AddOn $addOn): AddOnResource
    {
        return AddOnResource::make(
            AddOn::query()->with('categories')->withSalesFlag()->findOrFail($addOn->id)
        );
    }
}
