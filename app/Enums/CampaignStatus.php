<?php

namespace App\Enums;

/**
 * Cycle de vie d'une campagne (ENUM PostgreSQL `campaign_status`).
 */
enum CampaignStatus: string
{
    case Planifiee = 'planifiee';
    case Active = 'active';
    case Suspendue = 'suspendue';
    case Terminee = 'terminee';
    case Annulee = 'annulee';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /** Une campagne close n'accepte plus de nouvelle opération (RM-11). */
    public function isClosed(): bool
    {
        return in_array($this, [self::Terminee, self::Annulee], true);
    }

    /** Une campagne ouverte accepte les irrigations validées (RM-06). */
    public function acceptsIrrigation(): bool
    {
        return in_array($this, [self::Active, self::Planifiee], true);
    }

    public function label(): string
    {
        return match ($this) {
            self::Planifiee => 'Planifiée',
            self::Active => 'Active',
            self::Suspendue => 'Suspendue',
            self::Terminee => 'Terminée',
            self::Annulee => 'Annulée',
        };
    }
}
