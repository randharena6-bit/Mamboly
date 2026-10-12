<?php

namespace App\Policies;

use App\Models\Alert;
use App\Models\User;
use App\Policies\Concerns\HandlesFarmScoping;

class AlertPolicy
{
    use HandlesFarmScoping;

    public function view(User $user, Alert $alert): bool
    {
        return $this->ownsFarm($user, $alert);
    }

    /** Les alertes sont produites par le système : pas de création manuelle. */
    public function create(User $user): bool
    {
        return false;
    }

    /** Pas de modification du contenu d'une alerte ; on ne fait que la marquer lue. */
    public function update(User $user, Alert $alert): bool
    {
        return false;
    }

    public function delete(User $user, Alert $alert): bool
    {
        return $this->ownsFarm($user, $alert) && $user->isAdministrator();
    }
}
