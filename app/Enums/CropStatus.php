<?php

namespace App\Enums;

/**
 * Statut d'une culture du catalogue (ENUM PostgreSQL `crop_status`).
 */
enum CropStatus: string
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
