<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\Irrigation;
use App\Models\User;
use App\Policies\Concerns\HandlesFarmScoping;

class IrrigationPolicy
{
    use HandlesFarmScoping;

    public function view(User $user, Irrigation $irrigation): bool
    {
        return $this->ownsFarm($user, $irrigation);
    }

    /**
     * Valider une irrigation (dont celles dépassant le seuil RM-10) est réservé
     * à un responsable de l'exploitation ou à l'administrateur.
     */
    public function validate(User $user, Irrigation $irrigation): bool
    {
        return $user->isAdministrator()
            || ($this->ownsFarm($user, $irrigation) && $user->role?->name === RoleName::Responsable->value);
    }

    public function reject(User $user, Irrigation $irrigation): bool
    {
        return $this->validate($user, $irrigation);
    }

    public function cancel(User $user, Irrigation $irrigation): bool
    {
        return $this->ownsFarm($user, $irrigation);
    }
}
