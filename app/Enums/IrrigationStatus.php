<?php

namespace App\Enums;

/**
 * Statut d'une séance d'irrigation (ENUM PostgreSQL `irrigation_status`).
 */
enum IrrigationStatus: string
{
    case Brouillon = 'brouillon';
    case Planifiee = 'planifiee';
    case EnAttenteValidation = 'en_attente_validation';
    case Validee = 'validee';
    case Realisee = 'realisee';
    case Annulee = 'annulee';
    case Refusee = 'refusee';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Statuts qui consomment effectivement le stock d'eau et sont soumis aux
     * contrôles de cohérence (RM-02, RM-06, RM-10).
     */
    public function consumesStock(): bool
    {
        return in_array($this, [self::Validee, self::Realisee], true);
    }

    public function label(): string
    {
        return match ($this) {
            self::Brouillon => 'Brouillon',
            self::Planifiee => 'Planifiée',
            self::EnAttenteValidation => 'En attente de validation',
            self::Validee => 'Validée',
            self::Realisee => 'Réalisée',
            self::Annulee => 'Annulée',
            self::Refusee => 'Refusée',
        };
    }
}
