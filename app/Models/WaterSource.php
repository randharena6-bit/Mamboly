<?php

namespace App\Models;

use App\Models\Concerns\BelongsToFarm;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
    use BelongsToFarm;

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

    /** @return HasMany<WaterMovement, $this> */
    public function waterMovements(): HasMany
    {
        return $this->hasMany(WaterMovement::class);
    }

    /** @return HasMany<Irrigation, $this> */
    public function irrigations(): HasMany
    {
        return $this->hasMany(Irrigation::class);
    }

    /** @return HasMany<IrrigationSchedule, $this> */
    public function irrigationSchedules(): HasMany
    {
        return $this->hasMany(IrrigationSchedule::class);
    }

    /** @return HasMany<Alert, $this> */
    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class);
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
