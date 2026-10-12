<?php

namespace App\Support;

use App\Models\User;

/**
 * Contexte d'interface partagé par les modules de l'application.
 *
 * Chaque page métier monte un îlot React sous la session courante : le contexte
 * (utilisateur, exploitation active, alertes non lues) est décidé ici, côté
 * serveur, puis figé dans la vue Blade. Le client ne choisit jamais son
 * exploitation — c'est une décision serveur (RM-01).
 */
class AppContext
{
    /**
     * @return array{user: array<string, mixed>|null, farm: array<string, mixed>|null, unreadAlerts: int, canManage: bool}
     */
    public static function for(?User $user): array
    {
        if ($user === null) {
            return [
                'user' => null,
                'farm' => null,
                'unreadAlerts' => 0,
                'canManage' => false,
            ];
        }

        $farm = $user->farm;

        return [
            'user' => [
                'name' => $user->name,
                'role' => $user->role?->name,
                'initials' => $user->initials(),
            ],
            'farm' => $farm === null ? null : [
                'id' => $farm->id,
                'name' => $farm->name,
                'location' => $farm->location,
                'type' => $farm->type,
                'totalArea' => (float) $farm->total_area,
            ],
            'unreadAlerts' => $farm === null ? 0 : $farm->alerts()->where('is_read', false)->count(),
            'canManage' => $user->isAdministrator(),
        ];
    }
}
