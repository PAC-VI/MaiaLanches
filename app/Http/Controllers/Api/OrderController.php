<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Motoboy;
use App\Models\Order;
use App\Services\OrderService;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function __construct(private readonly OrderService $orderService)
    {
    }

    /**
     * Lista os pedidos do painel administrativo.
     * Filtros opcionais: ?status=novo, ?type=delivery, ?from=YYYY-MM-DD,
     * ?to=YYYY-MM-DD (dia da loja, inclusivos; padrão = hoje; máximo 92 dias)
     * e ?include_open=1 (também traz novo/em_preparo/pronto de dias anteriores).
     *
     * Rota protegida (só o admin logado acessa) — ver routes/api.php.
     * O cliente acompanha o próprio pedido por POST /api/order-status.
     */
    public function index(Request $request)
    {
        $filters = $request->validate([
            'status' => ['sometimes', 'string', Rule::in(Order::STATUSES)],
            'type' => ['sometimes', 'string', Rule::in(Order::TYPES)],
        ]);

        $query = Order::query()->with(['items.productSize.product', 'items.addOns.addOn', 'motoboy']);

        if (array_key_exists('status', $filters)) {
            $query->where('status', $filters['status']);
        }

        if (array_key_exists('type', $filters)) {
            $query->where('type', $filters['type']);
        }

        $this->applyPeriod($query, $request);

        $orders = $query->orderByDesc('created_at')->orderByDesc('id')->get();

        return OrderResource::collection($orders);
    }

    /**
     * Recebe um novo pedido do cliente (sem necessidade de login).
     *
     * O "access_token" só é devolvido aqui, nesta resposta — é a única vez.
     * O front-end deve salvá-lo (junto com o id) no localStorage: é o que
     * permite consultar o status do pedido depois (ver statusByTokens()),
     * sem precisar de telefone nem de qualquer outro dado pessoal.
     *
     * Idempotency-Key (uuid) + IP: a mesma chave em 10 minutos devolve
     * o mesmo pedido, sem criar outro.
     */
    public function store(StoreOrderRequest $request)
    {
        $idempotencyKey = trim((string) $request->header('Idempotency-Key', ''));

        if (! Str::isUuid($idempotencyKey)) {
            throw ValidationException::withMessages([
                'idempotency_key' => 'Não foi possível confirmar o envio do pedido. Tente de novo.',
            ]);
        }

        $cacheKey = 'order-idempotency:'.hash('sha256', $request->ip().'|'.$idempotencyKey);
        $cached = Cache::get($cacheKey);

        if (is_array($cached)) {
            return response()->json($cached, 201);
        }

        $lock = Cache::lock($cacheKey.':lock', 20);

        try {
            $lock->block(15);
        } catch (LockTimeoutException) {
            $cached = Cache::get($cacheKey);

            if (is_array($cached)) {
                return response()->json($cached, 201);
            }

            throw ValidationException::withMessages([
                'idempotency_key' => 'O pedido ainda está sendo enviado. Aguarde e tente de novo.',
            ]);
        }

        try {
            $cached = Cache::get($cacheKey);

            if (is_array($cached)) {
                return response()->json($cached, 201);
            }

            $order = $this->orderService->create($request->validated());
            $payload = json_decode(json_encode(OrderResource::make($order)->resolve($request)), true);
            $payload['access_token'] = $order->access_token;

            Cache::put($cacheKey, $payload, now()->addMinutes(10));

            return response()->json($payload, 201);
        } finally {
            $lock->release();
        }
    }

    /**
     * Detalhe de um pedido específico por ID. Rota protegida (admin).
     * O cliente não lista pedidos por telefone: usa o token de acesso.
     */
    public function show(Order $order)
    {
        return OrderResource::make(
            $order->load(['items.productSize.product', 'items.addOns.addOn', 'motoboy'])
        );
    }

    /**
     * Consulta pública do status de até 20 pedidos. O token vai no corpo
     * (não na URL, para não cair em log de acesso) e a resposta não traz
     * nome, telefone nem endereço. Token desconhecido volta null.
     */
    public function statusByTokens(Request $request)
    {
        $data = $request->validate([
            'tokens' => ['required', 'array', 'min:1', 'max:20'],
            'tokens.*' => ['required', 'string', 'size:40', 'regex:/^[A-Za-z0-9]+$/'],
        ], [
            'tokens.required' => 'Informe os pedidos para consultar.',
            'tokens.array' => 'Informe os pedidos para consultar.',
            'tokens.min' => 'Informe os pedidos para consultar.',
            'tokens.max' => 'Consulte no máximo 20 pedidos por vez.',
            'tokens.*.required' => 'Pedido inválido.',
            'tokens.*.string' => 'Pedido inválido.',
            'tokens.*.size' => 'Pedido inválido.',
            'tokens.*.regex' => 'Pedido inválido.',
        ]);

        $orders = Order::query()
            ->whereIn('access_token', $data['tokens'])
            ->get(['access_token', 'status', 'updated_at'])
            ->keyBy('access_token');

        $statuses = [];

        foreach ($data['tokens'] as $token) {
            $order = $orders->get($token);
            $statuses[$token] = $order ? [
                'status' => $order->status,
                'updated_at' => $order->updated_at?->toIso8601String(),
            ] : null;
        }

        return response()->json(['statuses' => $statuses]);
    }

    /**
     * Atualiza o status do pedido no painel administrativo.
     * Avanço manual: em_preparo -> pronto -> entregue.
     * novo -> em_preparo é só do comando orders:auto-accept.
     * Cancelamento: de novo, em_preparo ou pronto para cancelado.
     * Entregue e cancelado não mudam mais. Rota protegida.
     */
    public function updateStatus(Request $request, Order $order)
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:'.implode(',', Order::STATUSES)],
        ]);

        $updated = DB::transaction(function () use ($order, $data) {
            $locked = $this->lockOrder($order);
            $next = $data['status'];

            if ($locked->status === 'novo' && $next === 'em_preparo') {
                throw ValidationException::withMessages([
                    'status' => ['O pedido novo passa sozinho para em preparo. Essa etapa não é manual.'],
                ]);
            }

            if (! $locked->canMoveTo($next)) {
                $message = $next === Order::STATUS_CANCELLED
                    ? 'Só é possível cancelar um pedido novo, em preparo ou pronto.'
                    : 'O pedido não pode mudar para esse status.';

                throw ValidationException::withMessages([
                    'status' => [$message],
                ]);
            }

            $attributes = ['status' => $next];

            if ($next === Order::STATUS_CANCELLED) {
                $attributes['cancelled_at'] = now();
            }

            if ($next === 'entregue') {
                $attributes['delivered_at'] = now();
            }

            $locked->update($attributes);

            return $locked;
        });

        return OrderResource::make($updated->load(['items.productSize.product', 'items.addOns.addOn', 'motoboy']));
    }

    /**
     * Atribui, troca ou remove o motoboy de um pedido de entrega ainda aberto.
     */
    public function updateMotoboy(Request $request, Order $order)
    {
        $data = $request->validate([
            'motoboy_id' => ['present', 'nullable', 'integer'],
        ], [
            'motoboy_id.present' => 'Informe o motoboy.',
            'motoboy_id.integer' => 'Selecione um motoboy válido.',
        ]);

        $updated = DB::transaction(function () use ($order, $data) {
            $locked = $this->lockOrder($order);

            if ($locked->type !== 'delivery') {
                throw ValidationException::withMessages([
                    'motoboy_id' => 'Só pedidos de entrega podem ter motoboy.',
                ]);
            }

            if (in_array($locked->status, ['entregue', Order::STATUS_CANCELLED], true)) {
                throw ValidationException::withMessages([
                    'motoboy_id' => 'Não é possível alterar o motoboy deste pedido.',
                ]);
            }

            $motoboyId = $data['motoboy_id'];

            if ($motoboyId !== null) {
                $motoboy = Motoboy::query()
                    ->whereKey($motoboyId)
                    ->where('is_active', true)
                    ->first();

                if (! $motoboy) {
                    throw ValidationException::withMessages([
                        'motoboy_id' => 'Selecione um motoboy ativo.',
                    ]);
                }
            }

            $locked->update(['motoboy_id' => $motoboyId]);

            return $locked;
        });

        return OrderResource::make($updated->load(['items.productSize.product', 'items.addOns.addOn', 'motoboy']));
    }

    /**
     * Restringe a listagem ao intervalo de dias da loja. Sem from/to, vale hoje.
     */
    private function applyPeriod(Builder $query, Request $request): void
    {
        $timezone = config('app.timezone');
        $today = CarbonImmutable::now($timezone)->toDateString();

        $fromInput = $request->input('from');
        $toInput = $request->input('to');
        $fromInput = is_string($fromInput) ? trim($fromInput) : $fromInput;
        $toInput = is_string($toInput) ? trim($toInput) : $toInput;

        if (($fromInput === null || $fromInput === '') && ($toInput === null || $toInput === '')) {
            $fromInput = $today;
            $toInput = $today;
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

        $end = $to->addDay();

        $query->where(function (Builder $period) use ($from, $end, $request) {
            $period->where('created_at', '>=', $from->toDateTimeString())
                ->where('created_at', '<', $end->toDateTimeString());

            if ($request->boolean('include_open')) {
                $period->orWhere(function (Builder $open) use ($from) {
                    $open->where('created_at', '<', $from->toDateTimeString())
                        ->whereIn('status', Order::OPEN_STATUSES);
                });
            }
        });
    }

    /**
     * Marca o pedido como já enviado para a impressora da cozinha.
     */
    public function markPrinted(Order $order)
    {
        $updated = DB::transaction(function () use ($order) {
            $locked = $this->lockOrder($order);
            $locked->update(['is_printed' => true]);

            return $locked;
        });

        return OrderResource::make($updated->load(['items.productSize.product', 'items.addOns.addOn', 'motoboy']));
    }

    /**
     * Relê o pedido com lock e reaplica a regra em cima desse estado.
     */
    private function lockOrder(Order $order): Order
    {
        $locked = Order::query()->whereKey($order->id)->lockForUpdate()->first();

        if (! $locked) {
            abort(404, 'Pedido não encontrado.');
        }

        return $locked;
    }
}
