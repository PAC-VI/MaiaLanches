<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AddOnResource;
use App\Models\AddOn;
use Illuminate\Http\Request;

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
        $addOn->delete();

        return response()->noContent();
    }
}
