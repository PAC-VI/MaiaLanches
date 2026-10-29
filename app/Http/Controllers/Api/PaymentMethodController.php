<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentMethodResource;
use App\Models\PaymentMethod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentMethodController extends Controller
{
    /**
     * Lista pública: só as formas ativas, na ordem da loja.
     */
    public function index()
    {
        $methods = PaymentMethod::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json(
            $methods->map(fn (PaymentMethod $method) => [
                'code' => $method->code,
                'label' => $method->label,
            ])->values()
        );
    }

    public function adminIndex()
    {
        return PaymentMethodResource::collection(
            PaymentMethod::query()->orderBy('sort_order')->orderBy('id')->get()
        );
    }

    public function update(Request $request, PaymentMethod $paymentMethod)
    {
        if ($request->exists('label')) {
            $request->merge([
                'label' => trim((string) $request->input('label')),
            ]);
        }

        $data = $request->validate([
            'label' => ['sometimes', 'required', 'string', 'max:80'],
            'is_active' => ['sometimes', 'boolean'],
        ], [
            'label.required' => 'O nome da forma de pagamento é obrigatório.',
            'label.max' => 'O nome pode ter no máximo 80 caracteres.',
            'is_active.boolean' => 'Informe se a forma de pagamento está ativa.',
        ]);

        if (! array_key_exists('label', $data) && ! array_key_exists('is_active', $data)) {
            throw ValidationException::withMessages([
                'payment_method' => 'Informe o nome ou se a forma está ativa.',
            ]);
        }

        $updated = DB::transaction(function () use ($paymentMethod, $data) {
            $locked = PaymentMethod::query()->orderBy('id')->lockForUpdate()->get();
            $current = $locked->firstWhere('id', $paymentMethod->id);

            if (! $current) {
                abort(404);
            }

            $turningOff = array_key_exists('is_active', $data) && ! $data['is_active'];

            if ($turningOff && $current->is_active) {
                $anotherActive = $locked->contains(
                    fn (PaymentMethod $method) => $method->id !== $current->id && $method->is_active
                );

                if (! $anotherActive) {
                    throw ValidationException::withMessages([
                        'is_active' => 'Não é possível desativar a última forma de pagamento.',
                    ]);
                }
            }

            $current->update($data);

            return $current->refresh();
        });

        return PaymentMethodResource::make($updated);
    }
}
