<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WaterMovement;
use App\Policies\Concerns\HandlesFarmScoping;

class WaterMovementPolicy
{
    use HandlesFarmScoping;

    public function view(User $user, WaterMovement $movement): bool
    {
        return $this->ownsFarm($user, $movement);
    }

    /** Le journal d'eau est append-only : aucune modification ni suppression. */
    public function update(User $user, WaterMovement $movement): bool
    {
        return false;
    }

    public function delete(User $user, WaterMovement $movement): bool
    {
        return false;
    }
}
