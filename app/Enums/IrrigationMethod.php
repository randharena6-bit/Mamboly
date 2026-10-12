<?php

namespace App\Enums;

/**
 * Technique d'irrigation utilisée (ENUM PostgreSQL `irrigation_method`).
 */
enum IrrigationMethod: string
{
    case ArrosageManuel = 'arrosage_manuel';
    case GoutteAGoutte = 'goutte_a_goutte';
    case Aspersion = 'aspersion';
    case Gravitaire = 'gravitaire';
    case Tuyau = 'tuyau';
    case Pompe = 'pompe';
    case Autre = 'autre';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::ArrosageManuel => 'Arrosage manuel',
            self::GoutteAGoutte => 'Goutte-à-goutte',
            self::Aspersion => 'Aspersion',
            self::Gravitaire => 'Gravitaire',
            self::Tuyau => 'Tuyau',
            self::Pompe => 'Pompe',
            self::Autre => 'Autre',
        };
    }
}
