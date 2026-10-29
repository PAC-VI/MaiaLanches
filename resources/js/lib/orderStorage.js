/**
 * Guarda, no localStorage do próprio navegador, os pedidos que este
 * cliente já fez — sem nenhum dado sensível novo, só o necessário para
 * mostrar a lista e consultar o status depois:
 *   { id, access_token, number, status, total_amount, created_at, type,
 *     payment_method, items }
 *
 * O "access_token" é o que veio na resposta de POST /api/orders (ver
 * OrderController::store) e é a chave usada por orderStatusPolling.js
 * para perguntar ao backend o status atual — nunca telefone, nome ou endereço.
 * Os itens guardados são só nome, tamanho, quantidade e acréscimos.
 */

const STORAGE_KEY = 'maialanches:pedidos';

const PERSONAL_KEYS = ['customer_name', 'customer_phone', 'customer_cpf', 'delivery_address'];

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

        const orders = parsed
            .filter((order) => order && typeof order === 'object')
            .map(sanitize);

        if (parsed.some((order) => order && typeof order === 'object' && hasPersonalData(order))) {
            writeAll(orders);
        }

        return orders;
    } catch (_) {
        // localStorage indisponível (aba anônima bloqueada, cota cheia, etc.)
        return [];
    }
}

function writeAll(orders) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
        return true;
    } catch (_) {
        // idem — se não der pra salvar, a tela só não vai lembrar depois
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

    return writeAll(orders);
}

export function getSavedOrders() {
    return readAll();
}

export function updateOrderStatus(id, status, updatedAt) {
    const orders = readAll().map((order) => (order.id === id
        ? { ...order, status, updated_at: updatedAt }
        : order));

    writeAll(orders);
}

