/**
 * Guarda, no localStorage do próprio navegador, os pedidos que este
 * cliente já fez — sem nenhum dado sensível novo, só o necessário para
 * mostrar a lista e consultar o status depois:
 *   { id, access_token, daily_number, status, total_amount, created_at }
 *
 * O "access_token" é o que veio na resposta de POST /api/orders (ver
 * OrderController::store) e é a chave usada por orderStatusPolling.js
 * para perguntar ao backend o status atual — nunca telefone, nome ou CPF.
 */

const STORAGE_KEY = 'maialanches:pedidos';

function readAll() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (_) {
        // localStorage indisponível (aba anônima bloqueada, cota cheia, etc.)
        return [];
    }
}

function writeAll(orders) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch (_) {
        // idem — se não der pra salvar, a tela só não vai lembrar depois
    }
}

/**
 * Chamar logo após um POST /api/orders bem-sucedido, com a resposta da API.
 */
export function saveOrder(order) {
    const orders = readAll().filter((existing) => existing.id !== order.id);

    orders.unshift({
        id: order.id,
        access_token: order.access_token,
        daily_number: order.daily_number,
        status: order.status,
        total_amount: order.total_amount,
        created_at: order.created_at,
    });

    writeAll(orders);
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

export function removeOrder(id) {
    writeAll(readAll().filter((order) => order.id !== id));
}
