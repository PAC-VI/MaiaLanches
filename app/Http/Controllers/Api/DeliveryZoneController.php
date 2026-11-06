<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveryZone;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class DeliveryZoneController extends Controller
{
    public function index()
    {
        return DeliveryZone::query()->orderBy('radius_km')->get();
    }

    public function store(Request $request)
    {
        $data = $this->validatedZone($request);

        try {
            $zone = DeliveryZone::create($data);
        } catch (QueryException $exception) {
            $this->throwIfDuplicateRadius($exception);
        }

        return response()->json($zone, 201);
    }

    public function show(DeliveryZone $deliveryZone)
    {
        return $deliveryZone;
    }

    public function update(Request $request, DeliveryZone $deliveryZone)
    {
        $data = $this->validatedZone($request, $deliveryZone);

        try {
            $deliveryZone->update($data);
        } catch (QueryException $exception) {
            $this->throwIfDuplicateRadius($exception);
        }

        return $deliveryZone;
    }

    public function destroy(DeliveryZone $deliveryZone)
    {
        $deliveryZone->delete();

        return response()->noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedZone(Request $request, ?DeliveryZone $current = null): array
    {
        if (is_numeric($request->input('radius_km'))) {
            $request->merge([
                'radius_km' => round((float) $request->input('radius_km'), 2),
            ]);
        }

        $uniqueRadius = Rule::unique('delivery_zones', 'radius_km');

        if ($current) {
            $uniqueRadius->ignore($current->id);
        }

        $data = $request->validate([
            'radius_km' => ['required', 'numeric', 'min:0', 'max:999.99', 'decimal:0,2', $uniqueRadius],
            'fee_amount' => ['required', 'numeric', 'min:0'],
            'motoboy_payout_amount' => ['required', 'numeric', 'min:0'],
        ], [
            'radius_km.unique' => 'Já existe uma faixa com esse raio',
            'radius_km.required' => 'Informe o raio da faixa.',
            'radius_km.numeric' => 'Informe um raio válido.',
            'radius_km.decimal' => 'O raio deve ter no máximo 2 casas decimais.',
            'motoboy_payout_amount.required' => 'Informe o repasse do motoboy.',
            'motoboy_payout_amount.numeric' => 'Informe um repasse válido.',
            'motoboy_payout_amount.min' => 'O repasse não pode ser negativo.',
        ]);

        $data['radius_km'] = round((float) $data['radius_km'], 2);
        $data['motoboy_payout_amount'] = round((float) $data['motoboy_payout_amount'], 2);

        return $data;
    }

    private function throwIfDuplicateRadius(QueryException $exception): never
    {
        if ((int) ($exception->errorInfo[1] ?? 0) !== 1062) {
            throw $exception;
        }

        throw ValidationException::withMessages([
            'radius_km' => 'Já existe uma faixa com esse raio',
        ]);
    }
}
