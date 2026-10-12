<?php

namespace App\Services;

use App\Exceptions\InsufficientWaterException;
use App\Exceptions\WaterCapacityException;
use App\Models\Campaign;
use App\Models\Irrigation;
use App\Models\User;
use App\Models\WaterMovement;
use App\Models\WaterSource;
use Illuminate\Support\Facades\DB;

/**
 * Point d'entrée unique pour toute variation du stock d'eau (RM-04, RM-05, RM-09).
 *
 * Aucun code ne doit écrire `water_sources.available_quantity` directement :
 * chaque variation doit produire un `water_movements` traçable, la base le
 * vérifie au commit (`trg_water_sources_movement_trace`). Ce service garantit
 * que l'écriture du mouvement et celle du stock sont atomiques et que les
 * bornes `0 <= disponible <= capacité` sont respectées avant d'atteindre la base.
 */
class WaterStockService
{
    public function __construct(private readonly AlertService $alerts) {}

    /**
     * Applique un delta signé au stock d'une ressource et journalise le mouvement.
     *
     * @param  float  $delta  Positif = entrée d'eau, négatif = sortie.
     * @param  bool  $strict  `true` : lève une exception plutôt que de rogner le delta.
     */
    public function applyDelta(
        WaterSource $source,
        float $delta,
        string $type,
        User $user,
        ?Campaign $campaign = null,
        ?Irrigation $irrigation = null,
        ?string $note = null,
        bool $strict = true,
    ): WaterMovement {
        return DB::transaction(function () use ($source, $delta, $type, $user, $campaign, $irrigation, $note, $strict): WaterMovement {
            $locked = WaterSource::withoutFarmScope()
                ->lockForUpdate()
                ->findOrFail($source->getKey());

            $before = (float) $locked->available_quantity;
            $after = $before + $delta;

            if ($after < 0) {
                if ($strict) {
                    throw new InsufficientWaterException(sprintf(
                        'Stock insuffisant pour « %s » : %.2f %s disponibles, %.2f %s demandés.',
                        $locked->name,
                        $before,
                        $locked->unit,
                        abs($delta),
                        $locked->unit,
                    ));
                }

                $after = 0.0;
            }

            if ($after > (float) $locked->capacity) {
                if ($strict) {
                    throw new WaterCapacityException(sprintf(
                        'La capacité de « %s » (%.2f %s) serait dépassée par cet apport.',
                        $locked->name,
                        $locked->capacity,
                        $locked->unit,
                    ));
                }

                $after = (float) $locked->capacity;
            }

            $magnitude = round(abs($after - $before), 2);

            if ($magnitude <= 0.0) {
                throw $delta < 0
                    ? new InsufficientWaterException(sprintf('« %s » est déjà vide.', $locked->name))
                    : new WaterCapacityException(sprintf('« %s » est déjà plein.', $locked->name));
            }

            $movement = new WaterMovement([
                'farm_id' => $locked->farm_id,
                'water_source_id' => $locked->id,
                'campaign_id' => $campaign?->id,
                'irrigation_id' => $irrigation?->id,
                'user_id' => $user->id,
                'type' => $type,
                'quantity' => $magnitude,
                'quantity_before' => $before,
                'quantity_after' => $after,
                'movement_date' => now(),
                'note' => $note,
            ]);

            $locked->forceFill(['available_quantity' => $after])->save();
            $movement->save();

            // Le modèle appelant reste cohérent pour les contrôles de seuil éventuels.
            $source->setAttribute('available_quantity', $after);

            // Idempotent avec le déclencheur PostgreSQL (RM-08) : la première
            // alerte non lue gagne, l'autre est ignorée.
            $this->alerts->raiseWaterCriticalIfNeeded($locked, $before);

            return $movement;
        });
    }

    /** Sortie d'eau (consommation, perte, vidange…). */
    public function consume(
        WaterSource $source,
        float $quantity,
        User $user,
        string $type = 'consommation',
        ?Campaign $campaign = null,
        ?Irrigation $irrigation = null,
        ?string $note = null,
    ): WaterMovement {
        return $this->applyDelta($source, -abs($quantity), $type, $user, $campaign, $irrigation, $note);
    }

    /** Entrée d'eau (remplissage, ajout manuel…). */
    public function replenish(
        WaterSource $source,
        float $quantity,
        User $user,
        string $type = 'remplissage',
        ?string $note = null,
        bool $strict = true,
    ): WaterMovement {
        return $this->applyDelta($source, abs($quantity), $type, $user, null, null, $note, $strict);
    }

    /**
     * Fixe le stock à une valeur cible (correction d'inventaire, vidange).
     */
    public function setQuantity(
        WaterSource $source,
        float $target,
        User $user,
        string $type = 'correction',
        ?string $note = null,
    ): WaterMovement {
        $delta = round($target - (float) $source->available_quantity, 2);

        return $this->applyDelta($source, $delta, $type, $user, null, null, $note, true);
    }
}
