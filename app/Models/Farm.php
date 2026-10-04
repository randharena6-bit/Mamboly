<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Exploitation agricole : racine du cloisonnement multi-exploitations (RM-01).
 *
 * Un utilisateur porte l'appartenance via `users.farm_id` ; le responsable
 * désigné est `farms.manager_id`.
 *
 * @property int $id
 * @property string $name
 * @property string $location
 * @property string $type
 * @property float $total_area
 * @property int|null $manager_id
 * @property string $status
 */
class Farm extends Model
{
    protected $fillable = [
        'name',
        'location',
        'type',
        'total_area',
        'manager_id',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'total_area' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    /** @return HasMany<User, $this> */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
