<?php

namespace App\Enums;

/**
 * Catégorie d'intrant (ENUM PostgreSQL `input_category`).
 */
enum InputCategory: string
{
    case Semence = 'semence';
    case Engrais = 'engrais';
    case Compost = 'compost';
    case ProduitPhytosanitaire = 'produit_phytosanitaire';
    case Carburant = 'carburant';
    case Consommable = 'consommable';
    case Tuyau = 'tuyau';
    case PiecePompe = 'piece_pompe';
    case TraitementEau = 'traitement_eau';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::Semence => 'Semence',
            self::Engrais => 'Engrais',
            self::Compost => 'Compost',
            self::ProduitPhytosanitaire => 'Produit phytosanitaire',
            self::Carburant => 'Carburant',
            self::Consommable => 'Consommable',
            self::Tuyau => 'Tuyau',
            self::PiecePompe => 'Pièce de pompe',
            self::TraitementEau => 'Traitement de l\'eau',
        };
    }
}
