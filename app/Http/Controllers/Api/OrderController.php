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
     * Lista pedidos para o painel administrativo.
     * Filtros opcionais: ?status=novo e ?type=delivery.
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

    public function show(Order $order)
    {
        return OrderResource::make(
            $order->load(['items.productSize.product', 'items.addOns.addOn'])
        );
    }

    /**
     * Atualiza o status do pedido no painel administrativo
     * (novo -> em_preparo -> saiu_entrega -> concluido).
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
