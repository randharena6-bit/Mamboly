<?php

namespace App\Models\Scopes;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Cloisonnement multi-exploitations (RM-01) appliqué au niveau du modèle.
 *
 * Toute requête sur un modèle cloisonné est bornée au `farm_id` de
 * l'utilisateur connecté. L'administrateur global (`users.farm_id` nul)
 * conserve une portée transverse, et le contexte console (seeders, migrations,
 * commandes) n'est jamais filtré — aucune session n'y est ouverte.
 *
 * La portée est un filet de sécurité en lecture : les services écrivent
 * toujours un `farm_id` explicite, et `FarmPolicy` reste l'autorité en matière
 * d'accès à un objet précis.
 */
class FarmScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $user = auth()->user();

        // Aucun utilisateur (console, seeder, tests sans session) : portée
        // transverse. Un administrateur global (`farm_id` nul) voit tout.
        if (! $user instanceof User || $user->farm_id === null) {
            return;
        }

        $builder->where($model->qualifyColumn('farm_id'), $user->farm_id);
    }
}
