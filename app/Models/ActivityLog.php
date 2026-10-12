<?php

namespace App\Models;

use App\Models\Concerns\BelongsToFarm;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Journal d'audit des accès et opérations sensibles.
 *
 * Table append-only alimentée par le déclencheur `agriwater_log_operation`
 * (qui lit `agriwater.user_id`) et par les services (connexions, refus d'accès).
 *
 * @property int $id
 * @property int|null $farm_id
 * @property int|null $user_id
 * @property string $action
 * @property string $entity_type
 * @property int $entity_id
 * @property string|null $description
 * @property string|null $ip_address
 * @property string|null $user_agent
 * @property string $created_at
 */
class ActivityLog extends Model
{
    use BelongsToFarm;

    /** La table n'a pas de `updated_at` : le journal est immuable. */
    public const UPDATED_AT = null;

    protected $fillable = [
        'farm_id',
        'user_id',
        'action',
        'entity_type',
        'entity_id',
        'description',
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'entity_id' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
