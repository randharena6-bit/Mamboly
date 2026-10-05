<?php

namespace App\Policies;

use App\Models\Farm;
use App\Models\User;

/**
 * Autorisation d'accès à une exploitation.
 *
 * Le cloisonnement multi-exploitations (RM-01) est une règle d'autorisation :
 * elle ne peut pas reposer sur le masquage côté client, qui connaît les
 * identifiants. Un compte n'accède qu'à son exploitation ; seul
 * l'administrateur global (`users.farm_id` nul, rôle `administrateur`)
 * dispose d'une portée transverse.
 */
class FarmPolicy
{
    /** L'administrateur supervise toutes les exploitations. */
    public function before(User $user): ?bool
    {
        return $user->isAdministrator() ? true : null;
    }

    /** La liste des exploitations n'a de sens que pour l'administrateur. */
    public function viewAny(User $user): bool
    {
        return false;
    }

    /** Un membre de l'exploitation, ou l'administrateur via `before`. */
    public function view(User $user, Farm $farm): bool
    {
        return $user->farm_id !== null && $user->farm_id === $farm->id;
    }
}
