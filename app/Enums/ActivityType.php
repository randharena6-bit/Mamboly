<?php

namespace App\Enums;

/**
 * Type d'activité technique (ENUM PostgreSQL `activity_type`).
 */
enum ActivityType: string
{
    case PreparationSol = 'preparation_sol';
    case Semis = 'semis';
    case Repiquage = 'repiquage';
    case Fertilisation = 'fertilisation';
    case Traitement = 'traitement';
    case Desherbage = 'desherbage';
    case Irrigation = 'irrigation';
    case Entretien = 'entretien';
    case Recolte = 'recolte';
    case Observation = 'observation';
    case Nettoyage = 'nettoyage';
    case Autre = 'autre';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::PreparationSol => 'Préparation du sol',
            self::Semis => 'Semis',
            self::Repiquage => 'Repiquage',
            self::Fertilisation => 'Fertilisation',
            self::Traitement => 'Traitement',
            self::Desherbage => 'Désherbage',
            self::Irrigation => 'Irrigation',
            self::Entretien => 'Entretien',
            self::Recolte => 'Récolte',
            self::Observation => 'Observation',
            self::Nettoyage => 'Nettoyage',
            self::Autre => 'Autre',
        };
    }
}
