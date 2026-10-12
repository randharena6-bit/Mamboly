<?php

namespace App\Enums;

/**
 * Motif d'un mouvement de stock d'intrant (ENUM PostgreSQL `stock_movement_type`).
 */
enum StockMovementType: string
{
    case StockInitial = 'stock_initial';
    case Entree = 'entree';
    case Sortie = 'sortie';
    case Consommation = 'consommation';
    case Ajustement = 'ajustement';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /** Motifs qui augmentent le stock. */
    public function isIncoming(): bool
    {
        return in_array($this, [self::StockInitial, self::Entree], true);
    }

    public function label(): string
    {
        return match ($this) {
            self::StockInitial => 'Stock initial',
            self::Entree => 'Entrée',
            self::Sortie => 'Sortie',
            self::Consommation => 'Consommation',
            self::Ajustement => 'Ajustement',
        };
    }
}
