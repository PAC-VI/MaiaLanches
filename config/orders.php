<?php

/*
| Minutos em que o pedido fica "novo" até o comando orders:auto-accept
| passar o status para "em preparo". O painel não faz esse passo.
*/

$minutes = env('ORDER_AUTO_ACCEPT_MINUTES', 3);

return [
    'auto_accept_minutes' => max(1, (int) $minutes),
];
