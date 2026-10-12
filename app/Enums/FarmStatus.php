<?php

namespace App\Enums;

/**
 * Statut d'une exploitation (ENUM PostgreSQL `farm_status`).
 */
enum FarmStatus: string
{
    case Active = 'active';
    case Suspendue = 'suspendue';
    case Inactive = 'inactive';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Suspendue => 'Suspendue',
            self::Inactive => 'Inactive',
        };
    }
}
