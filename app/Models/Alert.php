<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Alerte métier levée sur un objet unique : eau critique, stock critique,
 * campagne à risque, incident système.
 *
 * La contrainte `alerts_single_target_check` impose exactement une cible
 * (`water_source_id`, `input_id` ou `campaign_id`) : les relations ci-dessous
 * servent à retrouver l'objet sans requête supplémentaire côté client.
 *
 * @property int $id
 * @property int $farm_id
 * @property int|null $water_source_id
 * @property int|null $input_id
 * @property int|null $campaign_id
 * @property string $type
 * @property string $severity
 * @property string $title
 * @property string $message
 * @property bool $is_read
 * @property string|null $read_at
 * @property string $created_at
 */
class Alert extends Model
{
    protected $fillable = [
        'farm_id',
        'water_source_id',
        'input_id',
        'campaign_id',
        'type',
        'severity',
        'title',
        'message',
        'is_read',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
            'read_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Farm, $this> */
    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    /** @return BelongsTo<WaterSource, $this> */
    public function waterSource(): BelongsTo
    {
        return $this->belongsTo(WaterSource::class);
    }

    /** @return BelongsTo<InputStock, $this> */
    public function inputStock(): BelongsTo
    {
        return $this->belongsTo(InputStock::class, 'input_id');
    }

    /** @return BelongsTo<Campaign, $this> */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class, 'campaign_id');
    }

    /** Marque l'alerte comme lue : `is_read` et `read_at` bougent ensemble (contrainte `alerts_read_check`). */
    public function markAsRead(): void
    {
        if ($this->is_read) {
            return;
        }

        $this->forceFill(['is_read' => true, 'read_at' => now()])->save();
    }
}
