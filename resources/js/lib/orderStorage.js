/**
 * Guarda, no localStorage do próprio navegador, os pedidos que este
 * cliente já fez — sem dado pessoal, só o necessário para mostrar a
 * lista e consultar o status depois:
 *   { id, access_token, number, status, total_amount, created_at, type,
 *     payment_method, items }
 *
 * No máximo 50 pedidos. Entregue ou cancelado com mais de 30 dias sai.
 * O "access_token" veio no POST /api/orders e é a chave do
 * orderStatusPolling.js. Nome, telefone e endereço nunca ficam aqui.
 */

const STORAGE_KEY = 'maialanches:pedidos';
const MAX_SAVED_ORDERS = 50;
const FINAL_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const FINAL_STATUSES = new Set(['entregue', 'cancelado']);

const PERSONAL_KEYS = [
    'customer_name',
    'customer_phone',
    'delivery_address',
    'delivery_street',
    'delivery_number',
    'delivery_neighborhood',
    'delivery_reference',
];

function asList(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (Array.isArray(value?.data)) {
        return value.data;
    }

    return [];
}

function snapshotItems(order) {
    return asList(order.items).slice(0, 30).map((item) => ({
        product_name: String(item.product_name || 'Item').slice(0, 120),
        size_name: item.size_name ? String(item.size_name).slice(0, 40) : '',
        quantity: Math.max(1, Number(item.quantity) || 1),
        add_ons: asList(item.add_ons)
            .map((addOn) => (addOn?.name ? String(addOn.name).slice(0, 80) : ''))
            .filter(Boolean),
    }));
}

function paymentCode(order) {
    const code = typeof order.payment_method === 'string' ? order.payment_method.trim() : '';

    if (!/^[a-z0-9_]{1,32}$/.test(code)) {
        return undefined;
    }

    return code;
}

function sanitize(order) {
    const type = order.type === 'delivery' || order.type === 'pickup' ? order.type : undefined;

    return {
        id: order.id,
        access_token: order.access_token,
        number: order.number ?? order.id,
        status: order.status,
        total_amount: order.total_amount,
        created_at: order.created_at,
        updated_at: order.updated_at,
        type,
        payment_method: paymentCode(order),
        items: snapshotItems(order),
    };
}

function hasPersonalData(order) {
    return PERSONAL_KEYS.some((key) => Object.prototype.hasOwnProperty.call(order, key));
}

function isExpiredFinal(order, now) {
    if (!FINAL_STATUSES.has(order.status)) {
        return false;
    }

    const stamp = Date.parse(order.updated_at || order.created_at || '');

    if (Number.isNaN(stamp)) {
        return false;
    }

    return now - stamp > FINAL_RETENTION_MS;
}

function prune(orders) {
    const now = Date.now();

    return orders
        .filter((order) => !isExpiredFinal(order, now))
        .slice(0, MAX_SAVED_ORDERS);
}

function readAll() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        const rawOrders = parsed.filter((order) => order && typeof order === 'object');
        const orders = prune(rawOrders.map(sanitize));

        if (orders.length !== parsed.length || rawOrders.some((order) => hasPersonalData(order))) {
            writeAll(orders);
        }

        return orders;
    } catch (_) {
        return [];
    }
}

function writeAll(orders) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * Chamar logo após um POST /api/orders bem-sucedido, com a resposta da API.
 * Devolve false se o navegador recusar o localStorage.
 */
export function saveOrder(order) {
    const orders = readAll().filter((existing) => existing.id !== order.id);

    orders.unshift(sanitize(order));

    return writeAll(prune(orders));
}

export function getSavedOrders() {
    return readAll();
}

export function updateOrderStatus(id, status, updatedAt) {
    const orders = readAll().map((order) => (order.id === id
        ? { ...order, status, updated_at: updatedAt ?? order.updated_at }
        : order));

    writeAll(prune(orders));
}
