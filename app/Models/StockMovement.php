<?php

namespace App\Models;

use App\Models\Concerns\BelongsToFarm;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Historique des mouvements d'intrant (entrée, sortie, consommation).
 *
 * @property int $id
 * @property int $farm_id
 * @property int $input_id
 * @property int|null $campaign_id
 * @property int $user_id
 * @property string $type
 * @property float $quantity
 * @property float $stock_before
 * @property float $stock_after
 * @property string $movement_date
 * @property string|null $note
 */
class StockMovement extends Model
{
    use BelongsToFarm;

    protected $fillable = [
        'farm_id',
        'input_id',
        'campaign_id',
        'user_id',
        'type',
        'quantity',
        'stock_before',
        'stock_after',
        'movement_date',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'float',
            'stock_before' => 'float',
            'stock_after' => 'float',
            'movement_date' => 'datetime',
        ];
    }

    /** @return BelongsTo<InputStock, $this> */
    public function inputStock(): BelongsTo
    {
        return $this->belongsTo(InputStock::class, 'input_id');
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

    /** `entree` si le stock a augmenté, `sortie` sinon. */
    public function direction(): string
    {
        return $this->stock_after >= $this->stock_before ? 'entree' : 'sortie';
    }
}
