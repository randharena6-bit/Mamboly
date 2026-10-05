<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Parcelle cultivable d'une exploitation.
 *
 * `area` est exprimé dans `area_unit` : la colonne est typée `surface_m2` mais
 * la graine stocke aussi des hectares, d'où la conversion à la lecture.
 *
 * @property int $id
 * @property int $farm_id
 * @property string $code
 * @property string $name
 * @property float $area
 * @property string $area_unit
 * @property string|null $location
 * @property string|null $soil_type
 * @property string $status
 * @property string $manual_priority
 * @property float|null $soil_moisture
 */
class Plot extends Model
{
    protected $fillable = [
        'farm_id',
        'code',
        'name',
        'area',
        'area_unit',
        'location',
        'soil_type',
        'status',
        'manual_priority',
        'soil_moisture',
    ];

    protected function casts(): array
    {
        return [
            'area' => 'float',
            'soil_moisture' => 'float',
        ];
    }

    /** @return BelongsTo<Farm, $this> */
    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    /** @return HasMany<Campaign, $this> */
    public function campaigns(): HasMany
    {
        return $this->hasMany(Campaign::class);
    }

    /** Surface normalisée en hectares, quelle que soit l'unité de saisie. */
    public function areaInHectares(): float
    {
        return $this->area_unit === 'ha' ? $this->area : $this->area / 10_000;
    }
}
