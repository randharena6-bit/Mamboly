<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Rôle applicatif : administrateur, responsable ou agent (CDC § 5).
 *
 * @property int $id
 * @property string $name
 * @property string|null $description
 * @property array $permissions
 */
class Role extends Model
{
    /** Les trois rôles imposés par la contrainte CHECK de la table. */
    public const ADMINISTRATEUR = 'administrateur';

    public const RESPONSABLE = 'responsable';

    public const AGENT = 'agent';

    protected $fillable = [
        'name',
        'description',
        'permissions',
    ];

    protected function casts(): array
    {
        return [
            'permissions' => 'array',
        ];
    }

    /** @return HasMany<User, $this> */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
