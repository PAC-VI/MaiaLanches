<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ========================================================
// ROTAS DO CLIENTE (Públicas)
// ========================================================
Route::get('/', function () {
    return Inertia::render('Home/Home');
});

Route::get('/meus-pedidos', function () {
    return Inertia::render('MeusPedidos/MeusPedidos');
});


// ========================================================
// ROTAS DO ADMINISTRADOR
// ========================================================
Route::prefix('admin')->group(function () {

    // ========================================================
    // ÁREA PÚBLICA (Admin)
    // ========================================================

    Route::get('/login', function () {
        return Inertia::render('Admin/Login/Login');
    })->name('login');

    // ========================================================
    // ÁREA RESTRITA (Protegida)
    // ========================================================

    // Agora que a API de login (ver routes/api.php + AuthController) está
    // funcionando de verdade, a proteção fica ativa: sem sessão válida,
    // o Laravel redireciona automaticamente para a rota "login" acima.
    Route::middleware(['auth'])->group(function () {
        // Quando o admin acessa a raiz, é jogado direto para os pedidos (comportamento esperado)
        Route::get('/', function () {
            return redirect('/admin/pedidos');
        });

        // URL: /admin/pedidos
        Route::get('/pedidos', function () {
            return Inertia::render('Admin/Pedidos/Pedidos');
        });

        // URL: /admin/produtos
        Route::get('/produtos', function () {
            return Inertia::render('Admin/Produtos/Produtos');
        });
    });
});