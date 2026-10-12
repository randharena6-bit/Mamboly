<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Violation d'une règle métier AgriWater.
 *
 * Chaque exception porte la règle concernée (`RM-xx`) pour que l'API la
 * renvoie au client et que l'interface puisse afficher un message contextualisé.
 */
class BusinessRuleException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $rule = 'RM',
        int $status = 422,
    ) {
        parent::__construct($message, $status);
    }

    /** Code HTTP associé à la violation. */
    public function status(): int
    {
        return $this->getCode() ?: 422;
    }
}
