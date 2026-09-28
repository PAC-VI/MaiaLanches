<?php

// ============================================================
// AUTENTICAÇÃO (sessão do Laravel, guard "web")
// ============================================================
// Só o admin faz login neste sistema. O front (React/Inertia, mesmo
// domínio) precisa enviar as requisições com credentials/cookies e o
// header X-XSRF-TOKEN nas rotas protegidas — ver o comentário completo
// em AuthController.
//
// As rotas abaixo usam o middleware "web" (em vez do "api" padrão),
// porque autenticação por sessão exige cookie de sessão + CSRF, que só
// existem no grupo "web". Isso é seguro aqui porque o front roda no
// mesmo domínio/porta do Laravel (não é preciso Sanctum/CORS).
// ============================================================

use App\Http\Controllers\Api\AddOnController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DeliveryZoneController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\StoreSettingController;
use Illuminate\Support\Facades\Route;

Route::middleware('web')->prefix('admin')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

// ============================================================
// ROTAS PÚBLICAS
// ============================================================
// Cardápio (consulta) e o fluxo do cliente sem login: fazer pedido e
// consultar os próprios pedidos pelo telefone.
// ============================================================

Route::get('/store-settings', [StoreSettingController::class, 'show']);

Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{category}', [CategoryController::class, 'show']);

Route::get('/add-ons', [AddOnController::class, 'index']);
Route::get('/add-ons/{addOn}', [AddOnController::class, 'show']);

Route::get('/delivery-zones', [DeliveryZoneController::class, 'index']);
Route::get('/delivery-zones/{deliveryZone}', [DeliveryZoneController::class, 'show']);

Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{product}', [ProductController::class, 'show']);

Route::post('/orders', [OrderController::class, 'store']);

// Consulta pública de status por token (ver OrderController::statusByToken).
// Throttle extra (além do "throttle:api" padrão) para dificultar tentativa
// de força bruta de tokens — 30 requisições/minuto por IP é mais que
// suficiente para o polling normal do front (a cada 15-30s).
Route::middleware('throttle:30,1')->get('/order-status/{token}', [OrderController::class, 'statusByToken']);

// ============================================================
// ROTAS PROTEGIDAS (só admin logado)
// ============================================================
// Tudo que cadastra, altera ou apaga dado, e a listagem completa de
// pedidos (que expõe nome/telefone/endereço de todo mundo).
// ============================================================

Route::middleware(['web', 'auth'])->group(function () {
    Route::put('/store-settings', [StoreSettingController::class, 'update']);

    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{category}', [CategoryController::class, 'update']);
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

    Route::post('/add-ons', [AddOnController::class, 'store']);
    Route::put('/add-ons/{addOn}', [AddOnController::class, 'update']);
    Route::delete('/add-ons/{addOn}', [AddOnController::class, 'destroy']);

    Route::post('/delivery-zones', [DeliveryZoneController::class, 'store']);
    Route::put('/delivery-zones/{deliveryZone}', [DeliveryZoneController::class, 'update']);
    Route::delete('/delivery-zones/{deliveryZone}', [DeliveryZoneController::class, 'destroy']);

    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{product}', [ProductController::class, 'update']);
    Route::delete('/products/{product}', [ProductController::class, 'destroy']);
    Route::patch('/products/{product}/availability', [ProductController::class, 'updateAvailability']);

    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    // Movida pra cá: buscar pedidos por telefone é útil pro admin (ex.: um
    // cliente liga perguntando pelo pedido), mas não deve ficar pública —
    // telefone não é segredo. O cliente agora usa /api/order-status/{token}.
    Route::get('/my-orders', [OrderController::class, 'myOrders']);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    Route::patch('/orders/{order}/printed', [OrderController::class, 'markPrinted']);
});
