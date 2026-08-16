<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ========================================================
// ROTAS DO CLIENTE (Públicas)
// ========================================================
Route::get('/', function () {
    return Inertia::render('Home');
});

Route::get('/meus-pedidos', function () {
    return Inertia::render('MeusPedidos');
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

    // Validação de autenticação (middleware) comentada para fins de teste, mas deve ser ativada em produção
    // Route::middleware(['auth'])->group(function () {
        // Quando o admin acessa a raiz, é jogado direto para os pedidos (comportamento esperado)
        Route::get('/', function () {
            return redirect('/admin/pedidos');
        });

        // URL: /admin/pedidos
        Route::get('/pedidos', function () {
            return Inertia::render('Admin/Pedidos/Pedidos'); 
        });

        // No futuro, adicionar /admin/....
    // });
});