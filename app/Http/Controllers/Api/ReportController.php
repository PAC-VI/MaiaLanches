<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SalesReportService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ReportController extends Controller
{
    public function __construct(private readonly SalesReportService $reports)
    {
    }

    /**
     * Agregados do painel. ?from=&to= são dias da loja, inclusivos.
     * Sem os dois, vale os últimos 30 dias. Máximo de 92 dias.
     * A validação segue o filtro de GET /orders, com esse padrão diferente.
     */
    public function index(Request $request)
    {
        [$from, $to] = $this->resolvePeriod($request);

        return response()->json($this->reports->build($from, $to));
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function resolvePeriod(Request $request): array
    {
        $timezone = config('app.timezone');
        $today = CarbonImmutable::now($timezone)->startOfDay();

        $fromInput = $request->input('from');
        $toInput = $request->input('to');
        $fromInput = is_string($fromInput) ? trim($fromInput) : $fromInput;
        $toInput = is_string($toInput) ? trim($toInput) : $toInput;

        if (($fromInput === null || $fromInput === '') && ($toInput === null || $toInput === '')) {
            $fromInput = $today->subDays(29)->toDateString();
            $toInput = $today->toDateString();
        }

        $validated = validator(
            ['from' => $fromInput, 'to' => $toInput],
            [
                'from' => ['required', 'date_format:Y-m-d'],
                'to' => ['required', 'date_format:Y-m-d'],
            ],
            [
                'from.required' => 'A data inicial é obrigatória.',
                'from.date_format' => 'A data inicial está em formato inválido.',
                'to.required' => 'A data final é obrigatória.',
                'to.date_format' => 'A data final está em formato inválido.',
            ],
        )->validate();

        $from = CarbonImmutable::parse($validated['from'], $timezone)->startOfDay();
        $to = CarbonImmutable::parse($validated['to'], $timezone)->startOfDay();

        if ($from->greaterThan($to)) {
            throw ValidationException::withMessages([
                'from' => ['A data inicial não pode ser maior que a data final.'],
            ]);
        }

        if ($from->diff($to)->days > 91) {
            throw ValidationException::withMessages([
                'to' => ['O intervalo máximo é de 92 dias.'],
            ]);
        }

        return [$from, $to];
    }
}
