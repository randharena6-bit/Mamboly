<?php

namespace App\Models\Concerns;

use App\Models\Farm;
use App\Models\Scopes\FarmScope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Rattache un modèle à une exploitation et lui applique le cloisonnement
 * multi-exploitations (RM-01) via `FarmScope`.
 *
 * Le trait fournit la relation `farm()` par défaut ; un modèle qui déclare sa
 * propre méthode `farm()` conserve la sienne (la classe prime sur le trait).
 */
trait BelongsToFarm
{
    public static function bootBelongsToFarm(): void
    {
        static::addGlobalScope(new FarmScope());
    }

    /** @return BelongsTo<Farm, $this> */
    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    /**
     * Requête sans le cloisonnement : réservé aux traitements transverses
     * explicites (administration, statistiques globales, tests).
     *
     * @return Builder<$this>
     */
    public static function withoutFarmScope(): Builder
    {
        return static::withoutGlobalScope(FarmScope::class);
    }
}
