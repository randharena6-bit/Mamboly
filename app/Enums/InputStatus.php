<?php

namespace App\Enums;

/**
 * Statut d'un intrant (ENUM PostgreSQL `input_status`).
 */
enum InputStatus: string
{
    case Actif = 'actif';
    case Inactif = 'inactif';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::Actif => 'Actif',
            self::Inactif => 'Inactif',
        };
    }
}
