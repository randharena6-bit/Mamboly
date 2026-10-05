<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Recette d'exploitation, éventuellement rattachée à une récolte.
 *
 * @property int $id
 * @property int $farm_id
 * @property int|null $campaign_id
 * @property int|null $harvest_id
 * @property int $user_id
 * @property string $revenue_date
 * @property float $amount
 * @property string|null $product
 * @property float|null $quantity
 * @property string|null $unit
 * @property string|null $client
 * @property string|null $comment
 */
class Revenue extends Model
{
    protected $fillable = [
        'farm_id',
        'campaign_id',
        'harvest_id',
        'user_id',
        'revenue_date',
        'amount',
        'product',
        'quantity',
        'unit',
        'client',
        'comment',
    ];

    protected function casts(): array
    {
        return [
            'revenue_date' => 'date',
            'amount' => 'float',
            'quantity' => 'float',
        ];
    }

    /** @return BelongsTo<Farm, $this> */
    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
