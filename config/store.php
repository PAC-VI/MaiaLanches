<?php

/*
| Texto fixo do modal de informações do cardápio.
| Não fica no banco: muda por ambiente, não pelo painel.
*/

return [
    'name' => env('STORE_NAME', 'Maia Lanches'),
    'description' => env(
        'STORE_DESCRIPTION',
        'Maia Lanches — lanches artesanais preparados na hora, com entrega e retirada no balcão.'
    ),
    // Texto do InfoModal. A cotação de frete não usa esta string.
    'address' => env('STORE_ADDRESS', 'Rua Faustino Busarello, 792'),
    'contact' => env('STORE_CONTACT', '(49) 99999-0000'),
    // Origem da rota e cidade anexada ao endereço do cliente.
    'lat' => env('STORE_LAT'),
    'lng' => env('STORE_LNG'),
    'city' => env('STORE_CITY'),
    'state' => env('STORE_STATE'),
];
