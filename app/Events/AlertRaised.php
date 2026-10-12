<?php

namespace App\Events;

use App\Models\Alert;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Une alerte métier vient d'être levée.
 *
 * Les auditeurs décident des canaux de diffusion (notification interne,
 * courriel) ; l'alerte est déjà persistée quand l'événement part.
 */
class AlertRaised
{
    use Dispatchable;

    public function __construct(public readonly Alert $alert) {}
}
