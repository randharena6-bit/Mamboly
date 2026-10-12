<?php

namespace App\Services;

use App\Events\StockMovementRecorded;
use App\Exceptions\InsufficientStockException;
use App\Models\Campaign;
use App\Models\InputStock;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Mouvements de stock d'intrants (RM-12).
 *
 * Comme pour l'eau, toute variation de `inputs.available_quantity` passe par
 * un `stock_movements` traçable. Le seuil minimal déclenche une alerte stock.
 */
class StockService
{
    public function __construct(private readonly AlertService $alerts) {}

    /**
     * @param  float  $delta  Positif = entrée, négatif = sortie.
     */
    public function applyDelta(
        InputStock $input,
        float $delta,
        string $type,
        User $user,
        ?Campaign $campaign = null,
        ?string $note = null,
        bool $strict = true,
    ): StockMovement {
        return DB::transaction(function () use ($input, $delta, $type, $user, $campaign, $note, $strict): StockMovement {
            $locked = InputStock::withoutFarmScope()
                ->lockForUpdate()
                ->findOrFail($input->getKey());

            $before = (float) $locked->available_quantity;
            $after = $before + $delta;

            if ($after < 0) {
                if ($strict) {
                    throw new InsufficientStockException(sprintf(
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

            $magnitude = round(abs($after - $before), 2);

            if ($magnitude <= 0.0) {
                throw new InsufficientStockException(sprintf('Le stock de « %s » est déjà à zéro.', $locked->name));
            }

            $movement = new StockMovement([
                'farm_id' => $locked->farm_id,
                'input_id' => $locked->id,
                'campaign_id' => $campaign?->id,
                'user_id' => $user->id,
                'type' => $type,
                'quantity' => $magnitude,
                'stock_before' => $before,
                'stock_after' => $after,
                'movement_date' => now(),
                'note' => $note,
            ]);

            $locked->forceFill(['available_quantity' => $after])->save();
            $movement->save();

            $input->setAttribute('available_quantity', $after);

            $this->alerts->raiseStockCriticalIfNeeded($locked, $before);

            DB::afterCommit(fn () => event(new StockMovementRecorded($movement, $user)));

            return $movement;
        });
    }

    /** Sortie de stock (consommation, sortie). */
    public function consume(
        InputStock $input,
        float $quantity,
        User $user,
        ?Campaign $campaign = null,
        string $type = 'consommation',
        ?string $note = null,
    ): StockMovement {
        return $this->applyDelta($input, -abs($quantity), $type, $user, $campaign, $note);
    }

    /** Entrée de stock (réapprovisionnement). */
    public function receive(
        InputStock $input,
        float $quantity,
        User $user,
        ?Campaign $campaign = null,
        string $type = 'entree',
        ?string $note = null,
    ): StockMovement {
        return $this->applyDelta($input, abs($quantity), $type, $user, $campaign, $note);
    }

    /** Fixe le stock à une valeur cible (inventaire). */
    public function setQuantity(
        InputStock $input,
        float $target,
        User $user,
        ?string $note = null,
    ): StockMovement {
        $delta = round($target - (float) $input->available_quantity, 2);

        return $this->applyDelta($input, $delta, 'ajustement', $user, null, $note);
    }
}
