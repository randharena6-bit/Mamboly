<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Cycle de production : une culture sur une parcelle et une période.
 *
 * @property int $id
 * @property int $farm_id
 * @property int $plot_id
 * @property int $crop_id
 * @property int|null $manager_id
 * @property string $code
 * @property string $name
 * @property string $start_date
 * @property string $expected_end_date
 * @property string|null $actual_end_date
 * @property float $area
 * @property string $status
 * @property string|null $notes
 */
class Campaign extends Model
{
    protected $fillable = [
        'farm_id',
        'plot_id',
        'crop_id',
        'manager_id',
        'code',
        'name',
        'start_date',
        'expected_end_date',
        'actual_end_date',
        'area',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'expected_end_date' => 'date',
            'actual_end_date' => 'date',
            'area' => 'float',
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

    /** @return HasMany<Irrigation, $this> */
    public function irrigations(): HasMany
    {
        return $this->hasMany(Irrigation::class);
    }

    /** @return HasMany<Activity, $this> */
    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }
}
