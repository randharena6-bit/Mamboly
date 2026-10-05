<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Activité technique réalisée sur une parcelle : semis, fertilisation,
 * récolte, irrigation…
 *
 * La table est partitionnée par mois sur `activity_date` et sa clé primaire
 * est composite `(id, activity_date)` : le modèle reste en lecture seule ici,
 * ce qui convient à un tableau de bord.
 *
 * @property int $id
 * @property int $farm_id
 * @property int|null $campaign_id
 * @property int $plot_id
 * @property int $user_id
 * @property string $type
 * @property string $activity_date
 * @property string|null $description
 * @property float|null $cost
 */
class Activity extends Model
{
    protected $fillable = [
        'farm_id',
        'campaign_id',
        'plot_id',
        'user_id',
        'type',
        'activity_date',
        'description',
        'cost',
    ];

    protected function casts(): array
    {
        return [
            'activity_date' => 'date',
            'cost' => 'float',
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

    /** @return BelongsTo<Campaign, $this> */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
