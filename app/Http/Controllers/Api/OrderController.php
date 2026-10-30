<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
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
     * Não confundir com myOrders(), que é a versão pública/filtrada
     * usada pelo cliente para ver só os pedidos dele mesmo.
     */
    public function index(Request $request)
    {
        $query = Order::query()->with(['items.productSize.product', 'items.addOns.addOn']);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('type')) {
            $query->where('type', $request->string('type'));
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
     * permite consultar o status do pedido depois (ver statusByToken()),
     * sem precisar de telefone nem de qualquer outro dado pessoal.
     */
    public function store(StoreOrderRequest $request)
    {
        $order = $this->orderService->create($request->validated());

        $payload = OrderResource::make($order)->toArray($request);
        $payload['access_token'] = $order->access_token;

        return response()->json($payload, 201);
    }

    /**
     * Detalhe de um pedido específico por ID. Rota protegida (admin) —
     * o cliente usa myOrders() para ver os próprios pedidos.
     */
    public function show(Order $order)
    {
        return OrderResource::make(
            $order->load(['items.productSize.product', 'items.addOns.addOn'])
        );
    }

    /**
     * Consulta pública de pedidos do próprio cliente (sem login), usada
     * pela tela "Meus Pedidos". Exige o telefone informado no pedido —
     * é o único "identificador" que o cliente sem cadastro tem em mãos.
     *
     * Importante: isto é diferente de index()/show(), que retornam
     * TODOS os pedidos e por isso são rotas protegidas (só admin).
     * Aqui o retorno é sempre restrito ao telefone informado.
     */
    public function myOrders(Request $request)
    {
        $data = $request->validate([
            'customer_phone' => ['required', 'string', 'max:20'],
        ]);

        $orders = Order::query()
            ->where('customer_phone', $data['customer_phone'])
            ->with(['items.productSize.product', 'items.addOns.addOn'])
            ->orderByDesc('created_at')
            ->get();

        return OrderResource::collection($orders);
    }

    /**
     * Consulta pública do status de UM pedido específico, pelo token gerado
     * na criação (ver store()) — não recebe nem devolve nenhum dado pessoal
     * (nome, telefone, CPF, endereço), só status e a data da última
     * atualização. É o que a tela "Meus Pedidos" chama periodicamente
     * (polling) para cada pedido salvo no localStorage do cliente.
     *
     * Isto substitui a antiga consulta pública por telefone (myOrders(),
     * agora restrita ao admin) como forma do cliente acompanhar o próprio
     * pedido, porque telefone é adivinhável e o token não.
     */
    public function statusByToken(string $token)
    {
        $order = Order::query()->where('access_token', $token)->first();

        if (! $order) {
            return response()->json(['message' => 'Pedido não encontrado.'], 404);
        }

        return response()->json([
            'status' => $order->status,
            'updated_at' => $order->updated_at?->toIso8601String(),
        ]);
    }

    /**
     * Atualiza o status do pedido no painel administrativo.
     * Avanço: novo -> em_preparo -> pronto -> entregue.
     * Cancelamento: de novo, em_preparo ou pronto para cancelado.
     * Entregue e cancelado não mudam mais. Rota protegida.
     */
    public function updateStatus(Request $request, Order $order)
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:'.implode(',', Order::STATUSES)],
        ]);

        $next = $data['status'];

        if (! $order->canMoveTo($next)) {
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

        $order->update($attributes);

        return OrderResource::make($order->load(['items.productSize.product', 'items.addOns.addOn']));
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
        $order->update(['is_printed' => true]);

        return OrderResource::make($order->load(['items.productSize.product', 'items.addOns.addOn']));
    }
}
