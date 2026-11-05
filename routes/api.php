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
use App\Http\Controllers\Api\MotoboyController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentMethodController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\StoreHourController;
use App\Http\Controllers\Api\StoreSettingController;
use Illuminate\Support\Facades\Route;

Route::middleware('web')->prefix('admin')->group(function () {
    // 5/min por e-mail + IP e 20/min por IP.
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:admin-login');

    Route::middleware('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);

        Route::get('/payment-methods', [PaymentMethodController::class, 'adminIndex']);
        Route::patch('/payment-methods/{paymentMethod}', [PaymentMethodController::class, 'update']);

        Route::get('/store-hours', [StoreHourController::class, 'adminIndex']);
        Route::put('/store-hours', [StoreHourController::class, 'update']);

        Route::get('/motoboys', [MotoboyController::class, 'index']);
        Route::post('/motoboys', [MotoboyController::class, 'store']);
        Route::get('/motoboys/{motoboy}/summary', [MotoboyController::class, 'summary']);
        Route::put('/motoboys/{motoboy}', [MotoboyController::class, 'update']);
        Route::delete('/motoboys/{motoboy}', [MotoboyController::class, 'destroy']);
    });
});

// ============================================================
// ROTAS PÚBLICAS
// ============================================================
// Cardápio (consulta) e o fluxo do cliente sem login: fazer pedido e
// consultar o status pelo token devolvido na criação.
// ============================================================

Route::get('/store-settings', [StoreSettingController::class, 'show']);
Route::get('/store-hours', [StoreHourController::class, 'index']);

Route::get('/payment-methods', [PaymentMethodController::class, 'index']);

Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{category}', [CategoryController::class, 'show']);

Route::get('/add-ons', [AddOnController::class, 'index']);
Route::get('/add-ons/{addOn}', [AddOnController::class, 'show']);

Route::get('/delivery-zones', [DeliveryZoneController::class, 'index']);
Route::get('/delivery-zones/{deliveryZone}', [DeliveryZoneController::class, 'show']);

Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{product}', [ProductController::class, 'show']);

// 5/min e 30/h por IP, mais 8/h por telefone (só os dígitos).
Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:public-orders');

// Status em lote. O token vai no corpo, não na URL, para não cair em log de acesso.
// 60/min por IP, além do throttle:api do grupo (120/min por IP).
Route::middleware('throttle:order-status')->post('/order-status', [OrderController::class, 'statusByTokens']);

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
    Route::patch('/categories/{category}/availability', [CategoryController::class, 'updateAvailability']);
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);

    Route::post('/add-ons', [AddOnController::class, 'store']);
    Route::put('/add-ons/{addOn}', [AddOnController::class, 'update']);
    Route::patch('/add-ons/{addOn}/availability', [AddOnController::class, 'updateAvailability']);
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
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    Route::patch('/orders/{order}/motoboy', [OrderController::class, 'updateMotoboy']);
    Route::patch('/orders/{order}/printed', [OrderController::class, 'markPrinted']);
});
