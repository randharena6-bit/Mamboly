<?php

namespace App\Exceptions;

/**
 * Capacité d'une ressource en eau dépassée (RM-05).
 */
class WaterCapacityException extends BusinessRuleException
{
    public function __construct(string $message = 'La capacité de la ressource en eau serait dépassée.', string $rule = 'RM-05')
    {
        parent::__construct($message, $rule);
    }
}
