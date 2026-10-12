<?php

namespace App\Models;

use App\Models\Concerns\BelongsToFarm;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Intention d'irrigation planifiée.
 *
 * Une planification n'a aucun effet sur le stock d'eau : elle sert à organiser
 * le travail et à mesurer le taux de réalisation (`v_irrigation_realization_rate`).
 *
 * @property int $id
 * @property int $farm_id
 * @property int $campaign_id
 * @property int $plot_id
 * @property int $water_source_id
 * @property int $agent_id
 * @property string $scheduled_date
 * @property string|null $scheduled_time
 * @property float $estimated_quantity
 * @property string $priority
 * @property string $status
 * @property string|null $comment
 */
class IrrigationSchedule extends Model
{
    use BelongsToFarm;

    protected $fillable = [
        'farm_id',
        'campaign_id',
        'plot_id',
        'water_source_id',
        'agent_id',
        'scheduled_date',
        'scheduled_time',
        'estimated_quantity',
        'priority',
        'status',
        'comment',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_date' => 'date',
            'estimated_quantity' => 'float',
        ];
    }

    /** @return BelongsTo<Campaign, $this> */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
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

    /** @return BelongsTo<User, $this> */
    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'agent_id');
    }
}
