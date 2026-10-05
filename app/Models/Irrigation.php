<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Séance d'irrigation réalisée — cœur du module eau.
 *
 * Chaque ligne consomme le stock de sa ressource en eau : la somme des
 * quantités par mois alimente la courbe de consommation du tableau de bord.
 *
 * @property int $id
 * @property int $farm_id
 * @property int $campaign_id
 * @property int $plot_id
 * @property int $water_source_id
 * @property int $performed_by
 * @property int|null $validated_by
 * @property string|null $scheduled_at
 * @property string $performed_at
 * @property float $quantity
 * @property string $unit
 * @property int|null $duration_minutes
 * @property string $method
 * @property string $status
 * @property string|null $observation
 */
class Irrigation extends Model
{
    protected $fillable = [
        'farm_id',
        'campaign_id',
        'plot_id',
        'water_source_id',
        'performed_by',
        'validated_by',
        'scheduled_at',
        'performed_at',
        'quantity',
        'unit',
        'duration_minutes',
        'method',
        'status',
        'observation',
    ];

    protected function casts(): array
    {
        return [
            'performed_at' => 'datetime',
            'quantity' => 'float',
            'duration_minutes' => 'integer',
        ];
    }

    /** @return BelongsTo<Farm, $this> */
    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    /** @return BelongsTo<Plot, $this> */
    public function plot(): BelongsTo
    {
        return $this->belongsTo(Plot::class);
    }

    /** @return BelongsTo<WaterSource, $this> */
    public function waterSource(): BelongsTo
    {
        return $this->belongsTo(WaterSource::class);
    }

    /** Quantité normalisée en litres : `m3` vaut 1 000 L. */
    public function quantityInLitres(): float
    {
        return $this->unit === 'm3' ? $this->quantity * 1_000 : $this->quantity;
    }
}
