<?php

namespace App\Policies;

use App\Models\Crop;
use App\Models\User;

/**
 * Le catalogue des cultures est global : tout compte le consulte, seul
 * l'administrateur global le maintient.
 */
class CropPolicy
{
    public function before(User $user): ?bool
    {
        return $user->isAdministrator() ? true : null;
    }

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Crop $crop): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return false;
    }

    public function update(User $user, Crop $crop): bool
    {
        return false;
    }

    public function delete(User $user, Crop $crop): bool
    {
        return false;
    }
}
