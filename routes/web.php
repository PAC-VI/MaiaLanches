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

        // URL: /admin/centraldepagamentos
        Route::get('/centraldepagamentos', function () {
            return Inertia::render('Admin/CentralDePagamentos/CentralDePagamentos');
        });

        // URL: /admin/taxasdeentrega
        Route::get('/taxasdeentrega', function () {
            return Inertia::render('Admin/TaxasDeEntrega/TaxasDeEntrega');
        });

        // URL: /admin/motoboys
        Route::get('/motoboys', function () {
            return Inertia::render('Admin/Motoboys/Motoboys');
        });

        // URL: /admin/relatorios
        Route::get('/relatorios', function () {
            return Inertia::render('Admin/Relatorios/Relatorios');
        });

        // URL: /admin/horarios
        Route::get('/horarios', function () {
            return Inertia::render('Admin/Horarios/Horarios');
        });

        // URL: /admin/impressao
        Route::get('/impressao', function () {
            return Inertia::render('Admin/Impressao/Impressao');
        });
    });
});