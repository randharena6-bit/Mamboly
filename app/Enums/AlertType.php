<?php

namespace App\Enums;

/**
 * Type d'alerte (ENUM PostgreSQL `alert_type`).
 */
enum AlertType: string
{
    case EauCritique = 'eau_critique';
    case StockCritique = 'stock_critique';
    case CampagneARisque = 'campagne_a_risque';
    case Systeme = 'systeme';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::EauCritique => 'Eau critique',
            self::StockCritique => 'Stock critique',
            self::CampagneARisque => 'Campagne à risque',
            self::Systeme => 'Système',
        };
    }
}
