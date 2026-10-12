<?php

namespace App\Policies\Concerns;

use App\Models\User;

/**
 * Autorisation par cloisonnement d'exploitation (RM-01).
 *
 * Un compte ne peut voir et modifier que les objets de son exploitation ;
 * l'administrateur global (`users.farm_id` nul) dispose d'une portée
 * transverse via `before`. Les modèles sont en plus filtrés en lecture par
 * `FarmScope`.
 */
trait HandlesFarmScoping
{
    /**
     * L'administrateur global supervise toutes les exploitations, mais ne crée
     * pas de ressource métier à leur place (`create` reste borné à sa propre
     * exploitation, nulle pour lui).
     */
    public function before(User $user, string $ability): ?bool
    {
        if (! $user->isAdministrator()) {
            return null;
        }

        return $ability === 'create' ? $user->farm_id !== null : true;
    }

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, object $model): bool
    {
        return $this->ownsFarm($user, $model);
    }

    public function create(User $user): bool
    {
        return $user->farm_id !== null;
    }

    public function update(User $user, object $model): bool
    {
        return $this->ownsFarm($user, $model);
    }

    public function delete(User $user, object $model): bool
    {
        return $this->ownsFarm($user, $model);
    }

    /** L'objet appartient-il à l'exploitation de l'utilisateur ? */
    protected function ownsFarm(User $user, object $model): bool
    {
        return $user->farm_id !== null
            && isset($model->farm_id)
            && (int) $user->farm_id === (int) $model->farm_id;
    }
}
