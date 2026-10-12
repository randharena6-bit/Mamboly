<?php

namespace App\Exceptions;

/**
 * Opération refusée sur une campagne close (RM-11) ou non autorisée (RM-06).
 */
class ClosedCampaignException extends BusinessRuleException
{
    public function __construct(string $message = 'La campagne est close : aucune nouvelle opération n\'est autorisée.', string $rule = 'RM-11')
    {
        parent::__construct($message, $rule);
    }
}
