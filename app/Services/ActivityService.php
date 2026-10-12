<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\Campaign;
use App\Models\Plot;
use App\Models\User;

/**
 * Enregistrement des activités techniques.
 *
 * Centralise la création d'`activities` pour que les contrôles applicatifs
 * (campagne close, cohérence d'exploitation) soient appliqués de la même façon
 * que les déclencheurs de la base.
 */
class ActivityService
{
    public function record(
        User $user,
        Plot $plot,
        string $type,
        string $date,
        ?string $description = null,
        ?float $cost = null,
        ?Campaign $campaign = null,
    ): Activity {
        return Activity::withoutFarmScope()->create([
            'farm_id' => $plot->farm_id,
            'campaign_id' => $campaign?->id,
            'plot_id' => $plot->id,
            'user_id' => $user->id,
            'type' => $type,
            'activity_date' => $date,
            'description' => $description,
            'cost' => $cost,
        ]);
    }
}
