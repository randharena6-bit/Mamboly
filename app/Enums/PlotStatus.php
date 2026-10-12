<?php

namespace App\Enums;

/**
 * Statut d'occupation d'une parcelle (ENUM PostgreSQL `plot_status`).
 */
enum PlotStatus: string
{
    case Disponible = 'disponible';
    case EnCulture = 'en_culture';
    case EnRepos = 'en_repos';
    case Indisponible = 'indisponible';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::Disponible => 'Disponible',
            self::EnCulture => 'En culture',
            self::EnRepos => 'En repos',
            self::Indisponible => 'Indisponible',
        };
    }
}
