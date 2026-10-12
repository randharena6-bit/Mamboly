<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\Revenue;
use App\Models\User;
use App\Policies\Concerns\HandlesFarmScoping;

class RevenuePolicy
{
    use HandlesFarmScoping;

    public function view(User $user, Revenue $revenue): bool
    {
        return $this->ownsFarm($user, $revenue);
    }

    /** La suppression d'une recette est réservée au responsable. */
    public function delete(User $user, Revenue $revenue): bool
    {
        return $this->ownsFarm($user, $revenue) && $user->role?->name === RoleName::Responsable->value;
    }
}
