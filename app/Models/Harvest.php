<?php

namespace App\Models;

use App\Models\Concerns\BelongsToFarm;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Récolte réalisée sur une campagne.
 *
 * La quantité vendue cumulée par les recettes ne peut pas dépasser `quantity`
 * (RM-13, vérifié par `trg_revenues_harvest_check`).
 *
 * @property int $id
 * @property int $farm_id
 * @property int $campaign_id
 * @property int $plot_id
 * @property int $user_id
 * @property string $product
 * @property string $harvest_date
 * @property float $quantity
 * @property string $unit
 * @property string|null $quality
 * @property float $loss_quantity
 * @property string|null $observation
 */
class Harvest extends Model
{
    use BelongsToFarm;

    protected $fillable = [
        'farm_id',
        'campaign_id',
        'plot_id',
        'user_id',
        'product',
        'harvest_date',
        'quantity',
        'unit',
        'quality',
        'loss_quantity',
        'observation',
    ];

    protected function casts(): array
    {
        return [
            'harvest_date' => 'date',
            'quantity' => 'float',
            'loss_quantity' => 'float',
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

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<Revenue, $this> */
    public function revenues(): HasMany
    {
        return $this->hasMany(Revenue::class);
    }

    /** Quantité nette : récolte moins pertes. */
    public function netQuantity(): float
    {
        return round($this->quantity - $this->loss_quantity, 2);
    }

    /** Quantité encore disponible à la vente (RM-13). */
    public function sellableQuantity(): float
    {
        $sold = (float) $this->revenues()->sum('quantity');

        return round($this->quantity - $sold, 2);
    }
}
