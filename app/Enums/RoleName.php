<?php

namespace App\Enums;

/**
 * Nom d'un rôle applicatif (contrainte CHECK de la table `roles`).
 */
enum RoleName: string
{
    case Administrateur = 'administrateur';
    case Responsable = 'responsable';
    case Agent = 'agent';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::Administrateur => 'Administrateur',
            self::Responsable => 'Responsable',
            self::Agent => 'Agent agricole',
        };
    }
}
