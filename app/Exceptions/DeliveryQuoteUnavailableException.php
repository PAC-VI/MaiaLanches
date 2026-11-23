<?php

namespace App\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;

class DeliveryQuoteUnavailableException extends HttpException
{
    public const MESSAGE = 'Não foi possível calcular a entrega agora. Tente novamente.';

    public function __construct()
    {
        parent::__construct(503, self::MESSAGE);
    }
}
