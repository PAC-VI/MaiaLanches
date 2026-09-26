<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(private readonly OrderService $orderService)
    {
    }

    /**
     * Lista TODOS os pedidos, para o painel administrativo.
     * Filtros opcionais: ?status=novo e ?type=delivery.
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

        $orders = $query->orderByDesc('created_at')->get();

        return OrderResource::collection($orders);
    }

    /**
     * Recebe um novo pedido do cliente (sem necessidade de login).
     */
    public function store(StoreOrderRequest $request)
    {
        $order = $this->orderService->create($request->validated());

        return OrderResource::make($order)
            ->response()
            ->setStatusCode(201);
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
     * Atualiza o status do pedido no painel administrativo
     * (novo -> em_preparo -> pronto -> entregue). Rota protegida.
     */
    public function updateStatus(Request $request, Order $order)
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'in:'.implode(',', Order::STATUSES)],
        ]);

        $order->update($data);

        return OrderResource::make($order->load(['items.productSize.product', 'items.addOns.addOn']));
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
