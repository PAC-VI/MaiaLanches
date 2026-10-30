<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StoreHourResource;
use App\Models\StoreHour;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Horário informado ao cliente. Não altera store_settings.is_open
 * e não existe agendador: abrir ou fechar a loja continua manual.
 *
 * Dia aberto exige abertura e fechamento diferentes, em HH:MM.
 * Fechamento anterior à abertura atravessa a meia-noite (18:00 até 00:00).
 */
class StoreHourController extends Controller
{
    public function index()
    {
        return response()->json([
            'today' => Carbon::now(config('app.timezone'))->dayOfWeek,
            'days' => $this->payload(),
        ]);
    }

    public function adminIndex()
    {
        return response()->json([
            'days' => $this->payload(),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'days' => ['required', 'array', 'size:7'],
            'days.*.weekday' => ['required', 'integer', 'between:0,6', 'distinct'],
            'days.*.is_open_day' => ['required', 'boolean'],
            'days.*.opens_at' => ['nullable', 'date_format:H:i'],
            'days.*.closes_at' => ['nullable', 'date_format:H:i'],
        ], [
            'days.required' => 'Informe os sete dias da semana.',
            'days.array' => 'Informe os sete dias da semana.',
            'days.size' => 'Informe os sete dias da semana.',
            'days.*.weekday.required' => 'Informe o dia da semana.',
            'days.*.weekday.integer' => 'Dia da semana inválido.',
            'days.*.weekday.between' => 'Dia da semana inválido.',
            'days.*.weekday.distinct' => 'Cada dia da semana deve aparecer uma vez.',
            'days.*.is_open_day.required' => 'Informe se o dia está aberto.',
            'days.*.is_open_day.boolean' => 'Informe se o dia está aberto.',
            'days.*.opens_at.date_format' => 'Use a abertura no formato HH:MM.',
            'days.*.closes_at.date_format' => 'Use o fechamento no formato HH:MM.',
        ]);

        $errors = [];

        foreach ($data['days'] as $index => $day) {
            if (! $this->asBool($day['is_open_day'])) {
                continue;
            }

            if (empty($day['opens_at']) || empty($day['closes_at'])) {
                $errors["days.$index.opens_at"] = 'Dia aberto precisa de abertura e fechamento.';
                continue;
            }

            if ($day['opens_at'] === $day['closes_at']) {
                $errors["days.$index.closes_at"] = 'Abertura e fechamento precisam ser diferentes.';
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        DB::transaction(function () use ($data) {
            foreach ($data['days'] as $day) {
                StoreHour::query()->updateOrCreate(
                    ['weekday' => (int) $day['weekday']],
                    [
                        'is_open_day' => $this->asBool($day['is_open_day']),
                        'opens_at' => $day['opens_at'] ?? null,
                        'closes_at' => $day['closes_at'] ?? null,
                    ]
                );
            }
        });

        return response()->json([
            'days' => $this->payload(),
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function payload(): array
    {
        return StoreHourResource::collection(
            StoreHour::query()->orderBy('weekday')->get()
        )->resolve();
    }

    private function asBool(mixed $value): bool
    {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }
}
