<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveryZone;
use Illuminate\Http\Request;

class DeliveryZoneController extends Controller
{
    public function index()
    {
        return DeliveryZone::query()->orderBy('radius_km')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'radius_km' => ['required', 'numeric', 'min:0'],
            'fee_amount' => ['required', 'numeric', 'min:0'],
        ]);

        $zone = DeliveryZone::create($data);

        return response()->json($zone, 201);
    }

    public function show(DeliveryZone $deliveryZone)
    {
        return $deliveryZone;
    }

    public function update(Request $request, DeliveryZone $deliveryZone)
    {
        $data = $request->validate([
            'radius_km' => ['required', 'numeric', 'min:0'],
            'fee_amount' => ['required', 'numeric', 'min:0'],
        ]);

        $deliveryZone->update($data);

        return $deliveryZone;
    }

    public function destroy(DeliveryZone $deliveryZone)
    {
        $deliveryZone->delete();

        return response()->noContent();
    }
}
