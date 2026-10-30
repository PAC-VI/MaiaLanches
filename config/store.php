<?php

/*
| Texto fixo do modal de informações do cardápio.
| Não fica no banco: muda por ambiente, não pelo painel.
*/

return [
    'description' => env(
        'STORE_DESCRIPTION',
        'Maia Lanches — lanches artesanais preparados na hora, com entrega e retirada no balcão.'
    ),
    'address' => env('STORE_ADDRESS', 'Rua Faustino Busarello, 792'),
    'contact' => env('STORE_CONTACT', '(49) 99999-0000'),
];
