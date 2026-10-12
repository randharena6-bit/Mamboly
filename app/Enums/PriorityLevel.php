<?php

namespace App\Enums;

/**
 * Niveau de priorité (ENUM PostgreSQL `priority_level`).
 */
enum PriorityLevel: string
{
    case Faible = 'faible';
    case Normale = 'normale';
    case Elevee = 'elevee';
    case Critique = 'critique';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /** Poids utilisé par la vue `v_irrigation_priority` et le service associé. */
    public function weight(): int
    {
        return match ($this) {
            self::Faible => 0,
            self::Normale => 10,
            self::Elevee => 20,
            self::Critique => 30,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Faible => 'Faible',
            self::Normale => 'Normale',
            self::Elevee => 'Élevée',
            self::Critique => 'Critique',
        };
    }
}
