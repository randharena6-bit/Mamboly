<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'farm_id',
        'role_id',
        'name',
        'email',
        'password',
        'phone',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Exploitation de rattachement. `farm_id` est nullable : un administrateur
     * global n'appartient à aucune exploitation.
     *
     * @return BelongsTo<Farm, $this>
     */
    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    /** @return BelongsTo<Role, $this> */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * Les comptes désactivés ne peuvent pas ouvrir de session, même avec le
     * bon mot de passe.
     */
    public function isActive(): bool
    {
        return (bool) $this->is_active;
    }

    /**
     * Administrateur global : rôle `administrateur` et aucune exploitation de
     * rattachement. C'est le seul profil autorisé à superviser les autres
     * exploitations.
     */
    public function isAdministrator(): bool
    {
        return $this->farm_id === null && $this->role?->name === 'administrateur';
    }

    /** Initiales affichées dans les pastilles d'identification. */
    public function initials(): string
    {
        $parts = preg_split('/\s+/', trim($this->name)) ?: [];

        return mb_strtoupper(
            mb_substr((string) ($parts[0] ?? ''), 0, 1).mb_substr((string) (end($parts) ?: ''), 0, 1)
        );
    }
}
