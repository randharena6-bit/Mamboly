<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\User;

/**
 * Gestion des comptes d'une exploitation.
 *
 * Un responsable gère les comptes de son exploitation ; l'administrateur
 * global dispose via `before` d'une portée transverse.
 */
class UserPolicy
{
    public function before(User $user): ?bool
    {
        return $user->isAdministrator() ? true : null;
    }

    public function viewAny(User $user): bool
    {
        return $user->farm_id !== null;
    }

    public function view(User $user, User $model): bool
    {
        return $this->sameFarm($user, $model);
    }

    public function create(User $user): bool
    {
        return $user->farm_id !== null && $this->isManager($user);
    }

    public function update(User $user, User $model): bool
    {
        return $this->sameFarm($user, $model) && $this->isManager($user);
    }

    public function delete(User $user, User $model): bool
    {
        // On ne se supprime pas soi-même.
        return $model->id !== $user->id
            && $this->sameFarm($user, $model)
            && $this->isManager($user);
    }

    private function sameFarm(User $user, User $model): bool
    {
        return $user->farm_id !== null && (int) $user->farm_id === (int) $model->farm_id;
    }

    private function isManager(User $user): bool
    {
        return $user->role?->name === RoleName::Responsable->value;
    }
}
