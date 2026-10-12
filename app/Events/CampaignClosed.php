<?php

namespace App\Events;

use App\Models\Campaign;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Une campagne a été clôturée (terminée ou annulée) : plus aucune opération
 * n'y est possible (RM-11).
 */
class CampaignClosed
{
    use Dispatchable;

    public function __construct(
        public readonly Campaign $campaign,
        public readonly User $actor,
    ) {}
}
