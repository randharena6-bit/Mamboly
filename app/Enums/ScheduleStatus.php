<?php

namespace App\Enums;

/**
 * Statut d'une planification d'irrigation (ENUM PostgreSQL `schedule_status`).
 */
enum ScheduleStatus: string
{
    case Planifiee = 'planifiee';
    case Realisee = 'realisee';
    case Reportee = 'reportee';
    case Annulee = 'annulee';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::Planifiee => 'Planifiée',
            self::Realisee => 'Réalisée',
            self::Reportee => 'Reportée',
            self::Annulee => 'Annulée',
        };
    }
}
