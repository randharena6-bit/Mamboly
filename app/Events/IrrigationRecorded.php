<?php

namespace App\Events;

use App\Models\Irrigation;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Une irrigation vient d'être enregistrée (réalisée ou validée).
 *
 * Déclenché après que le stock d'eau a été consommé, pour que les auditeurs
 * observent un état cohérent.
 */
class IrrigationRecorded
{
    use Dispatchable;

    public function __construct(
        public readonly Irrigation $irrigation,
        public readonly User $actor,
    ) {}
}
