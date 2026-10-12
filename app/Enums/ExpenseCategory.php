<?php

namespace App\Enums;

/**
 * Catégorie de dépense (ENUM PostgreSQL `expense_category`).
 */
enum ExpenseCategory: string
{
    case Semences = 'semences';
    case Engrais = 'engrais';
    case Carburant = 'carburant';
    case ReparationPompe = 'reparation_pompe';
    case Materiel = 'materiel';
    case MainOeuvre = 'main_oeuvre';
    case Transport = 'transport';
    case EnergieElectrique = 'energie_electrique';
    case AchatEau = 'achat_eau';
    case Traitement = 'traitement';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::Semences => 'Semences',
            self::Engrais => 'Engrais',
            self::Carburant => 'Carburant',
            self::ReparationPompe => 'Réparation de pompe',
            self::Materiel => 'Matériel',
            self::MainOeuvre => 'Main-d\'œuvre',
            self::Transport => 'Transport',
            self::EnergieElectrique => 'Énergie électrique',
            self::AchatEau => 'Achat d\'eau',
            self::Traitement => 'Traitement',
        };
    }
}
