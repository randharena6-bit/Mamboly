<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\Campaign;
use App\Models\User;
use App\Policies\Concerns\HandlesFarmScoping;

class CampaignPolicy
{
    use HandlesFarmScoping;

    public function view(User $user, Campaign $campaign): bool
    {
        return $this->ownsFarm($user, $campaign);
    }

    /** Clôturer une campagne est réservé à un responsable ou à l'administrateur. */
    public function close(User $user, Campaign $campaign): bool
    {
        return $user->isAdministrator()
            || ($this->ownsFarm($user, $campaign) && $user->role?->name === RoleName::Responsable->value);
    }
}
