<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ressource en eau d'une exploitation : puits, citerne, bassin, réservoir.
 *
 * Deux invariants sont garantis par la base (RM-04, RM-05) :
 * `0 <= available_quantity <= capacity`. `isBelowThreshold()` les exploite pour
 * alimenter les jauges et les alertes du tableau de bord.
 *
 * @property int $id
 * @property int $farm_id
 * @property string $name
 * @property string $type
 * @property float $capacity
 * @property float $available_quantity
 * @property string $unit
 * @property float $critical_threshold
 * @property string|null $location
 * @property string $status
 */
class WaterSource extends Model
{
    protected $fillable = [
        'farm_id',
        'name',
        'type',
        'capacity',
        'available_quantity',
        'unit',
        'critical_threshold',
        'location',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'capacity' => 'float',
            'available_quantity' => 'float',
            'critical_threshold' => 'float',
        ];
    }

    /** @return BelongsTo<Farm, $this> */
    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    /** Taux de remplissage, borné à 100 % pour l'affichage des jauges. */
    public function fillRatio(): float
    {
        if ($this->capacity <= 0) {
            return 0;
        }

        return min(($this->available_quantity / $this->capacity) * 100, 100);
    }

    public function isBelowThreshold(): bool
    {
        return $this->available_quantity <= $this->critical_threshold;
    }
}
