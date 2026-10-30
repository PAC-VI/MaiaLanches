<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AddOnResource;
use App\Models\AddOn;
use App\Models\OrderItemAddOn;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AddOnController extends Controller
{
    public function index()
    {
        return AddOnResource::collection(
            AddOn::query()->orderBy('name')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:add_ons,name'],
            'price' => ['required', 'numeric', 'min:0'],
        ]);

        $addOn = AddOn::create($data);

        return AddOnResource::make($addOn)
            ->response()
            ->setStatusCode(201);
    }

    public function show(AddOn $addOn)
    {
        return AddOnResource::make($addOn);
    }

    public function update(Request $request, AddOn $addOn)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:add_ons,name,'.$addOn->id],
            'price' => ['required', 'numeric', 'min:0'],
        ]);

        $addOn->update($data);

        return AddOnResource::make($addOn);
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
}
