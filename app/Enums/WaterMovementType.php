<?php

namespace App\Enums;

/**
 * Motif d'un mouvement d'eau (ENUM PostgreSQL `water_movement_type`).
 *
 * Le sens (entrée/sortie) est déduit du couple `quantity_before` /
 * `quantity_after` de la ligne, pas d'une colonne dédiée.
 */
enum WaterMovementType: string
{
    case StockInitial = 'stock_initial';
    case Remplissage = 'remplissage';
    case AjoutManuel = 'ajout_manuel';
    case Consommation = 'consommation';
    case Perte = 'perte';
    case Ajustement = 'ajustement';
    case Correction = 'correction';
    case Vidange = 'vidange';
    case Transfert = 'transfert';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /** Motifs qui augmentent le stock de la ressource. */
    public function isIncoming(): bool
    {
        return in_array($this, [self::StockInitial, self::Remplissage, self::AjoutManuel], true);
    }

    public function label(): string
    {
        return match ($this) {
            self::StockInitial => 'Stock initial',
            self::Remplissage => 'Remplissage',
            self::AjoutManuel => 'Ajout manuel',
            self::Consommation => 'Consommation',
            self::Perte => 'Perte',
            self::Ajustement => 'Ajustement',
            self::Correction => 'Correction',
            self::Vidange => 'Vidange',
            self::Transfert => 'Transfert',
        };
    }
}
