<?php

namespace App\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;

class DeliveryQuoteUnavailableException extends HttpException
{
    public const MESSAGE = 'Não foi possível calcular a entrega agora. Tente novamente.';

    public function __construct(?string $message = null)
    {
        parent::__construct(503, $message ?? self::MESSAGE);
    }
}
