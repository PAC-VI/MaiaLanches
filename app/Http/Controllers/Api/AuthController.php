<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/**
 * Autenticação do painel administrativo.
 *
 * Único usuário do sistema que faz login (dono/atendentes da lanchonete —
 * tabela "users"). O cliente final nunca autentica: ele só informa nome,
 * telefone, CPF opcional etc. na hora do pedido (ver OrderController).
 *
 * Usa sessão do próprio Laravel (guard "web", cookie de sessão), e não
 * token de API — o React é servido pelo mesmo domínio/porta do Laravel
 * (aplicação Inertia), então não há necessidade de Sanctum ou de guardar
 * token no localStorage. O front deve:
 *   1. Enviar as requisições com `credentials: 'include'` (fetch) ou
 *      `withCredentials: true` (axios), para o cookie de sessão ir junto.
 *   2. Nas requisições POST/PUT/PATCH/DELETE (login, logout e qualquer
 *      rota protegida), enviar o header "X-XSRF-TOKEN" com o valor do
 *      cookie "XSRF-TOKEN" (o Laravel já seta esse cookie sozinho em
 *      qualquer resposta; o axios faz isso automaticamente sozinho).
 */
class AuthController extends Controller
{
    /**
     * Autentica o admin e inicia uma sessão.
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials, remember: true)) {
            throw ValidationException::withMessages([
                'email' => 'Credenciais inválidas.',
            ]);
        }

        $request->session()->regenerate();

        return response()->json([
            'user' => $request->user()->only(['id', 'name', 'email']),
        ]);
    }

    /**
     * Encerra a sessão do admin.
     */
    public function logout(Request $request)
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }

    /**
     * Diz ao frontend se há um admin logado agora, e quem é.
     * 401 quando não há sessão ativa (o frontend usa isso para decidir
     * se manda o usuário para /admin/login).
     */
    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user()->only(['id', 'name', 'email']),
        ]);
    }
}
