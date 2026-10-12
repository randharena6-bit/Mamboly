<?php

namespace App\Models;

use App\Models\Concerns\BelongsToFarm;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Journal append-only des variations du stock d'eau (RM-09).
 *
 * Chaque modification de `water_sources.available_quantity` doit avoir une
 * contrepartie ici : la base le vérifie au commit via un constraint trigger
 * différé (`trg_water_sources_movement_trace`). Le sens du mouvement
 * (entrée/sortie) se déduit de `quantity_before` et `quantity_after`.
 *
 * @property int $id
 * @property int $farm_id
 * @property int $water_source_id
 * @property int|null $campaign_id
 * @property int|null $irrigation_id
 * @property int $user_id
 * @property string $type
 * @property float $quantity
 * @property float $quantity_before
 * @property float $quantity_after
 * @property string $movement_date
 * @property string|null $note
 */
class WaterMovement extends Model
{
    use BelongsToFarm;

    /** Journal append-only : pas de `updated_at`. */
    public const UPDATED_AT = null;

    protected $fillable = [
        'farm_id',
        'water_source_id',
        'campaign_id',
        'irrigation_id',
        'user_id',
        'type',
        'quantity',
        'quantity_before',
        'quantity_after',
        'movement_date',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'float',
            'quantity_before' => 'float',
            'quantity_after' => 'float',
            'movement_date' => 'datetime',
        ];
    }

    /** @return BelongsTo<WaterSource, $this> */
    public function waterSource(): BelongsTo
    {
        return $this->belongsTo(WaterSource::class);
    }

    /** @return BelongsTo<Campaign, $this> */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    /** @return BelongsTo<Irrigation, $this> */
    public function irrigation(): BelongsTo
    {
        return $this->belongsTo(Irrigation::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** `entree` si le stock a augmenté, `sortie` sinon. */
    public function direction(): string
    {
        return $this->quantity_after >= $this->quantity_before ? 'entree' : 'sortie';
    }

    /** Signed delta, pratique pour les courbes de consommation. */
    public function signedQuantity(): float
    {
        return round($this->quantity_after - $this->quantity_before, 2);
    }
}
