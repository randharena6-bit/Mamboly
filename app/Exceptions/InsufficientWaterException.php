<?php

namespace App\Exceptions;

/**
 * Stock d'eau insuffisant pour l'opération demandée (RM-04).
 */
class InsufficientWaterException extends BusinessRuleException
{
    public function __construct(string $message = 'Le stock d\'eau disponible est insuffisant pour cette opération.', string $rule = 'RM-04')
    {
        parent::__construct($message, $rule);
    }
}
