<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WaterSource;
use App\Policies\Concerns\HandlesFarmScoping;

class WaterSourcePolicy
{
    use HandlesFarmScoping;

    public function view(User $user, WaterSource $waterSource): bool
    {
        return $this->ownsFarm($user, $waterSource);
    }
}
