<?php

namespace App\Enums;

/**
 * Unité de volume d'eau (ENUM PostgreSQL `water_unit`).
 */
enum WaterUnit: string
{
    case Litre = 'L';
    case CubicMeter = 'm3';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::Litre => 'litres',
            self::CubicMeter => 'm³',
        };
    }

    /** Convertit un volume exprimé dans cette unité en litres. */
    public function toLitres(float $value): float
    {
        return $this === self::CubicMeter ? $value * 1_000 : $value;
    }
}
