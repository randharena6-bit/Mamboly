<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\Activity;
use App\Models\User;
use App\Policies\Concerns\HandlesFarmScoping;

class ActivityPolicy
{
    use HandlesFarmScoping;

    public function view(User $user, Activity $activity): bool
    {
        return $this->ownsFarm($user, $activity);
    }

    /** La suppression d'une activité est réservée au responsable. */
    public function delete(User $user, Activity $activity): bool
    {
        return $this->ownsFarm($user, $activity) && $user->role?->name === RoleName::Responsable->value;
    }
}
