<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Culture du catalogue global, partagée par toutes les exploitations.
 *
 * `water_requirement` est un besoin de référence exprimé en litres par mètre
 * carré ; il sert de base aux recommandations d'irrigation du module eau.
 *
 * @property int $id
 * @property string $name
 * @property string $category
 * @property int $estimated_duration_days
 * @property float $water_requirement
 * @property string $production_unit
 * @property string $status
 */
class Crop extends Model
{
    protected $fillable = [
        'name',
        'category',
        'estimated_duration_days',
        'water_requirement',
        'production_unit',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'estimated_duration_days' => 'integer',
            'water_requirement' => 'float',
        ];
    }

    /** @return HasMany<Campaign, $this> */
    public function campaigns(): HasMany
    {
        return $this->hasMany(Campaign::class);
    }
}
