/**
 * Helper de requisições para as rotas PÚBLICAS da API (cardápio, criação
 * de pedido, consulta de status por token — ver routes/api.php).
 *
 * Diferente de lib/adminApi.js, essas rotas não passam pelo grupo "web"
 * do Laravel (não usam sessão nem login), então não precisam de cookie
 * de sessão nem do header X-XSRF-TOKEN — é só um fetch JSON comum.
 */
export async function publicApiFetch(path, options = {}) {
    const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    const response = await fetch(`/api${path}`, {
        ...options,
        headers,
    });

    let data = null;
    try {
        data = await response.json();
    } catch (_) {
        // resposta sem corpo (204 No Content, por exemplo)
    }

    if (!response.ok) {
        const error = new Error(data?.message || `Erro ${response.status}`);
        error.status = response.status;
        error.errors = data?.errors ?? null;
        throw error;
    }

    return data;
}
