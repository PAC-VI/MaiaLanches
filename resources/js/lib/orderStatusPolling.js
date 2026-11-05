/**
 * Uma consulta por ciclo para os pedidos ainda abertos no localStorage.
 * POST /api/order-status recebe até 20 tokens e devolve
 * { statuses: { "<token>": { status, updated_at } | null } }.
 * Token null vira "nao_encontrado" e sai das próximas consultas.
 * Rede, 429 e 5xx sobem erro para a tela avisar e tentar de novo.
 */

import { getSavedOrders, updateOrderStatus } from './orderStorage';

const FINAL_STATUSES = new Set(['entregue', 'cancelado', 'nao_encontrado']);
const TOKEN = /^[A-Za-z0-9]{40}$/;

let cycleStart = 0;
let inFlight = false;

function offlineError(status) {
    const error = new Error('offline');
    error.status = status;
    return error;
}

export async function pollOrderStatuses() {
    if (inFlight) {
        return { changed: false, skipped: true };
    }

    const pending = getSavedOrders().filter((order) => !FINAL_STATUSES.has(order.status));

    if (pending.length === 0) {
        return { changed: false, skipped: false };
    }

    inFlight = true;

    try {
        let changed = false;
        const valid = [];

        pending.forEach((order) => {
            if (!TOKEN.test(String(order.access_token || ''))) {
                updateOrderStatus(order.id, 'nao_encontrado', order.updated_at);
                changed = true;
                return;
            }

            valid.push(order);
        });

        if (valid.length === 0) {
            return { changed, skipped: false };
        }

        const batchSize = Math.min(20, valid.length);
        const start = cycleStart % valid.length;
        const batch = [];

        for (let index = 0; index < batchSize; index += 1) {
            batch.push(valid[(start + index) % valid.length]);
        }

        cycleStart = (start + batchSize) % valid.length;

        let response;

        try {
            response = await fetch('/api/order-status', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tokens: batch.map((order) => order.access_token) }),
            });
        } catch (_) {
            throw offlineError(0);
        }

        if (!response.ok) {
            throw offlineError(response.status);
        }

        let data = null;

        try {
            data = await response.json();
        } catch (_) {
            throw offlineError(response.status);
        }

        const statuses = data?.statuses;

        if (!statuses || typeof statuses !== 'object' || Array.isArray(statuses)) {
            throw offlineError(response.status);
        }

        batch.forEach((order) => {
            const entry = Object.prototype.hasOwnProperty.call(statuses, order.access_token)
                ? statuses[order.access_token]
                : null;

            if (entry === null) {
                updateOrderStatus(order.id, 'nao_encontrado', order.updated_at);
                changed = true;
                return;
            }

            if (!entry || typeof entry.status !== 'string') {
                return;
            }

            if (entry.status !== order.status || entry.updated_at !== order.updated_at) {
                updateOrderStatus(order.id, entry.status, entry.updated_at);
                changed = true;
            }
        });

        return { changed, skipped: false };
    } finally {
        inFlight = false;
    }
}
