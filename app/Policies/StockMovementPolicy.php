<?php

namespace App\Policies;

use App\Models\StockMovement;
use App\Models\User;
use App\Policies\Concerns\HandlesFarmScoping;

class StockMovementPolicy
{
    use HandlesFarmScoping;

    public function view(User $user, StockMovement $movement): bool
    {
        return $this->ownsFarm($user, $movement);
    }

    public function update(User $user, StockMovement $movement): bool
    {
        return false;
    }

    public function delete(User $user, StockMovement $movement): bool
    {
        return false;
    }
}
