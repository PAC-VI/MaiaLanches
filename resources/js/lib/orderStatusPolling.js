/**
 * Rotina de polling: pergunta ao backend o status atual de cada pedido
 * salvo no localStorage (por token, ver orderStorage.js) e atualiza o
 * que está guardado quando o status muda.
 *
 * Não manda nem recebe nenhum dado pessoal — só o token que o próprio
 * navegador já tinha guardado, e a API devolve só { status, updated_at }
 * (ver OrderController::statusByToken).
 *
 * Uso: enquanto a tela "Meus Pedidos" estiver aberta, chamar
 * pollOrderStatuses() a cada 15-30s (ver MeusPedidos.jsx).
 */

import { getSavedOrders, updateOrderStatus } from './orderStorage';

const FINAL_STATUS = 'entregue';

export async function pollOrderStatuses(onUpdate) {
    const pendingOrders = getSavedOrders().filter((order) => order.status !== FINAL_STATUS);

    await Promise.all(
        pendingOrders.map(async (order) => {
            try {
                const response = await fetch(`/api/order-status/${order.access_token}`, {
                    headers: { Accept: 'application/json' },
                });

                if (!response.ok) return;

                const data = await response.json();

                if (data.status && data.status !== order.status) {
                    updateOrderStatus(order.id, data.status, data.updated_at);
                    onUpdate?.();
                }
            } catch (_) {
                // sem internet / servidor fora do ar neste ciclo — tenta de novo no próximo polling
            }
        }),
    );
}
