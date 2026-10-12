<?php

namespace App\Enums;

/**
 * Gravité d'une alerte (ENUM PostgreSQL `alert_severity`).
 */
enum AlertSeverity: string
{
    case Info = 'info';
    case Avertissement = 'avertissement';
    case Critique = 'critique';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /** Ordre de tri croissant : `info` < `avertissement` < `critique`. */
    public function weight(): int
    {
        return match ($this) {
            self::Info => 0,
            self::Avertissement => 1,
            self::Critique => 2,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Info => 'Information',
            self::Avertissement => 'Avertissement',
            self::Critique => 'Critique',
        };
    }
}
