/**
 * Helper de requisições para as rotas protegidas do painel administrativo
 * (ver app/Http/Controllers/Api/AuthController.php).
 *
 * O login usa sessão do próprio Laravel (guard "web"), não token de API.
 * Por isso toda requisição precisa:
 *   1. Ir com `credentials: 'include'`, para o cookie de sessão viajar junto.
 *   2. Levar o header "X-XSRF-TOKEN" com o valor do cookie "XSRF-TOKEN"
 *      (o Laravel seta esse cookie sozinho em qualquer resposta da rota
 *      "web"; aqui só lemos ele de volta do document.cookie).
 */

function readCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Faz uma requisição para /api/{path} já com credenciais e CSRF configurados.
 * Lança um Error com `.status` e `.errors` (formato de validação do Laravel)
 * quando a resposta não é 2xx.
 */
export async function apiFetch(path, options = {}) {
    const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    const token = readCookie('XSRF-TOKEN');
    if (token) {
        headers['X-XSRF-TOKEN'] = token;
    }

    const response = await fetch(`/api${path}`, {
        credentials: 'include',
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
