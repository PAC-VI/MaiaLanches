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
            'motoboy_payout_amount' => ['required', 'numeric', 'min:0'],
        ], [
            'motoboy_payout_amount.required' => 'Informe o repasse do motoboy.',
            'motoboy_payout_amount.numeric' => 'Informe um repasse válido.',
            'motoboy_payout_amount.min' => 'O repasse não pode ser negativo.',
        ]);

        $data['motoboy_payout_amount'] = round((float) $data['motoboy_payout_amount'], 2);

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
            'motoboy_payout_amount' => ['required', 'numeric', 'min:0'],
        ], [
            'motoboy_payout_amount.required' => 'Informe o repasse do motoboy.',
            'motoboy_payout_amount.numeric' => 'Informe um repasse válido.',
            'motoboy_payout_amount.min' => 'O repasse não pode ser negativo.',
        ]);

        $data['motoboy_payout_amount'] = round((float) $data['motoboy_payout_amount'], 2);

        $deliveryZone->update($data);

        return $deliveryZone;
    }

    public function destroy(DeliveryZone $deliveryZone)
    {
        $deliveryZone->delete();

        return response()->noContent();
    }
}
