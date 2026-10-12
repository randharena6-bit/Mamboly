<?php

namespace App\Enums;

/**
 * Unité de surface d'une parcelle (ENUM PostgreSQL `area_unit`).
 */
enum AreaUnit: string
{
    case M2 = 'm2';
    case Hectare = 'ha';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::M2 => 'm²',
            self::Hectare => 'ha',
        };
    }

    /** Convertit une surface exprimée dans cette unité en mètres carrés. */
    public function toSquareMeters(float $value): float
    {
        return $this === self::Hectare ? $value * 10_000 : $value;
    }

    /** Convertit une surface exprimée dans cette unité en hectares. */
    public function toHectares(float $value): float
    {
        return $this === self::Hectare ? $value : $value / 10_000;
    }
}
