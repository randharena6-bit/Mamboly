<?php

namespace App\Enums;

/**
 * Nature d'une ressource en eau (ENUM PostgreSQL `water_source_type`).
 */
enum WaterSourceType: string
{
    case Puits = 'puits';
    case Citerne = 'citerne';
    case Bassin = 'bassin';
    case Reservoir = 'reservoir';
    case Canal = 'canal';
    case Riviere = 'riviere';
    case ReservePluie = 'reserve_pluie';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::Puits => 'Puits',
            self::Citerne => 'Citerne',
            self::Bassin => 'Bassin',
            self::Reservoir => 'Réservoir',
            self::Canal => 'Canal',
            self::Riviere => 'Rivière',
            self::ReservePluie => 'Réserve d\'eau de pluie',
        };
    }
}
