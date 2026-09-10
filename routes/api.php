<?php

// NOTA: assim como em routes/web.php, a autenticação do painel admin
// ainda não está ativa. Antes de ir para produção, proteja as rotas de
// escrita (store/update/destroy de categories, add-ons, delivery-zones,
// products, e updateStatus/markPrinted de orders) com um middleware de
// autenticação (ex.: Laravel Sanctum), deixando apenas a listagem do
// cardápio e o envio de pedidos (orders.store) como públicas.

use App\Http\Controllers\Api\AddOnController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DeliveryZoneController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\StoreSettingController;
use Illuminate\Support\Facades\Route;

// ========================================================
// CONFIGURAÇÕES DA LOJA
// ========================================================
Route::get('/store-settings', [StoreSettingController::class, 'show']);
Route::put('/store-settings', [StoreSettingController::class, 'update']);

// ========================================================
// CATÁLOGO (CARDÁPIO)
// ========================================================
Route::apiResource('categories', CategoryController::class);

Route::apiResource('add-ons', AddOnController::class)
    ->parameters(['add-ons' => 'addOn']);

Route::apiResource('delivery-zones', DeliveryZoneController::class)
    ->parameters(['delivery-zones' => 'deliveryZone']);

Route::apiResource('products', ProductController::class);

// ========================================================
// PEDIDOS
// ========================================================
Route::apiResource('orders', OrderController::class)
    ->only(['index', 'store', 'show']);

Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
Route::patch('/orders/{order}/printed', [OrderController::class, 'markPrinted']);
