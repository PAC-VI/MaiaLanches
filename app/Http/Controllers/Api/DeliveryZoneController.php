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
        return DeliveryZone::query()
            ->orderBy('radius_km')
            ->orderBy('id')
            ->get()
            ->map(fn (DeliveryZone $zone) => $this->present($zone))
            ->values();
    }

    public function store(Request $request)
    {
        $data = $this->validatedZone($request);

        try {
            $zone = DeliveryZone::create($data);
        } catch (QueryException $exception) {
            $this->throwIfDuplicateRadius($exception);
        }

        return response()->json($this->present($zone), 201);
    }

    public function show(DeliveryZone $deliveryZone)
    {
        return $this->present($deliveryZone);
    }

    public function update(Request $request, DeliveryZone $deliveryZone)
    {
        $data = $this->validatedZone($request, $deliveryZone);

        try {
            $deliveryZone->update($data);
        } catch (QueryException $exception) {
            $this->throwIfDuplicateRadius($exception);
        }

        return $this->present($deliveryZone->refresh());
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
        $uniqueRadius = Rule::unique('delivery_zones', 'radius_km');

        if ($current) {
            $uniqueRadius->ignore($current->id);
        }

        $data = $request->validate([
            'radius_km' => ['required', 'numeric', 'gt:0', 'max:99.99', 'decimal:0,2', $uniqueRadius],
            'fee_amount' => ['required', 'numeric', 'min:0', 'max:9999.99', 'decimal:0,2'],
        ], [
            'radius_km.unique' => 'Já existe uma faixa com esse raio',
            'radius_km.required' => 'Informe o raio da faixa.',
            'radius_km.numeric' => 'Informe um raio válido.',
            'radius_km.gt' => 'O raio deve ser maior que zero.',
            'radius_km.max' => 'O raio máximo é 99,99 km.',
            'radius_km.decimal' => 'O raio deve ter no máximo 2 casas decimais.',
            'fee_amount.required' => 'Informe a taxa.',
            'fee_amount.numeric' => 'Informe uma taxa válida.',
            'fee_amount.min' => 'A taxa não pode ser negativa.',
            'fee_amount.max' => 'A taxa máxima é 9999,99.',
            'fee_amount.decimal' => 'A taxa deve ter no máximo 2 casas decimais.',
        ]);

        $data['radius_km'] = number_format(round((float) $data['radius_km'], 2), 2, '.', '');
        $data['fee_amount'] = number_format(round((float) $data['fee_amount'], 2), 2, '.', '');

        return $data;
    }

    /**
     * @return array{id: int, radius_km: mixed, fee_amount: mixed}
     */
    private function present(DeliveryZone $zone): array
    {
        return [
            'id' => $zone->id,
            'radius_km' => $zone->radius_km,
            'fee_amount' => $zone->fee_amount,
        ];
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
