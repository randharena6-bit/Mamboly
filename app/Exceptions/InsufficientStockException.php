<?php

namespace App\Exceptions;

/**
 * Stock d'intrant insuffisant pour la sortie demandée (RM-12).
 */
class InsufficientStockException extends BusinessRuleException
{
    public function __construct(string $message = 'Le stock disponible est insuffisant pour ce mouvement.', string $rule = 'RM-12')
    {
        parent::__construct($message, $rule);
    }
}
