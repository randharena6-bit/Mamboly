<?php

namespace App\Enums;

/**
 * Disponibilité d'une ressource en eau (ENUM PostgreSQL `water_source_status`).
 */
enum WaterSourceStatus: string
{
    case Active = 'active';
    case Maintenance = 'maintenance';
    case Indisponible = 'indisponible';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /** Seule une ressource active peut alimenter une irrigation validée (RM-02). */
    public function canIrrigate(): bool
    {
        return $this === self::Active;
    }

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Maintenance => 'En maintenance',
            self::Indisponible => 'Indisponible',
        };
    }
}
