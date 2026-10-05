<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Intrant agricole suivi en stock : semences, engrais, produits
 * phytosanitaires, carburant…
 *
 * L'état du stock est dérivé de `available_quantity` et `minimum_threshold`
 * plutôt que stocké : la base garantit `available_quantity >= 0` (RM-12).
 *
 * @property int $id
 * @property int $farm_id
 * @property string $name
 * @property string $category
 * @property string $unit
 * @property float $minimum_threshold
 * @property float $available_quantity
 * @property float $unit_price
 * @property string|null $supplier
 * @property string $status
 */
class InputStock extends Model
{
    /** La table s'appelle `inputs`, le nom de classe distingue le modèle métier. */
    protected $table = 'inputs';

    protected $fillable = [
        'farm_id',
        'name',
        'category',
        'unit',
        'minimum_threshold',
        'available_quantity',
        'unit_price',
        'supplier',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'minimum_threshold' => 'float',
            'available_quantity' => 'float',
            'unit_price' => 'float',
        ];
    }

    /** @return BelongsTo<Farm, $this> */
    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    /** @return HasMany<Alert, $this> */
    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class);
    }

    /** Valeur du stock restant, dans la devise de l'exploitation. */
    public function stockValue(): float
    {
        return $this->available_quantity * $this->unit_price;
    }

    public function isBelowThreshold(): bool
    {
        return $this->available_quantity <= $this->minimum_threshold;
    }
}
