<?php

namespace App\Policies;

use App\Models\Harvest;
use App\Models\User;
use App\Policies\Concerns\HandlesFarmScoping;

class HarvestPolicy
{
    use HandlesFarmScoping;

    public function view(User $user, Harvest $harvest): bool
    {
        return $this->ownsFarm($user, $harvest);
    }
}
