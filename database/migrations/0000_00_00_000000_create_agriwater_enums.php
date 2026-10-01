<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Types énumérés PostgreSQL d'AgriWater (CDC § 12).
 *
 * PostgreSQL uniquement : ces types natifs n'ont pas d'équivalent en SQLite.
 * Cette migration doit s'exécuter avant toutes les migrations de tables métier.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
        CREATE TYPE area_unit          AS ENUM ('m2', 'ha');
        CREATE TYPE water_unit         AS ENUM ('L', 'm3');

        CREATE TYPE farm_status        AS ENUM ('active', 'suspendue', 'inactive');

        CREATE TYPE plot_status        AS ENUM ('disponible', 'en_culture', 'en_repos', 'indisponible');
        CREATE TYPE crop_status        AS ENUM ('actif', 'inactif');
        CREATE TYPE input_status       AS ENUM ('actif', 'inactif');

        CREATE TYPE campaign_status    AS ENUM ('planifiee', 'active', 'suspendue', 'terminee', 'annulee');

        CREATE TYPE water_source_type  AS ENUM ('puits', 'citerne', 'bassin', 'reservoir',
                                                'canal', 'riviere', 'reserve_pluie');
        CREATE TYPE water_source_status AS ENUM ('active', 'maintenance', 'indisponible');

        CREATE TYPE water_movement_type AS ENUM ('stock_initial', 'remplissage', 'ajout_manuel',
                                                'consommation', 'perte', 'ajustement',
                                                'correction', 'vidange', 'transfert');

        CREATE TYPE irrigation_status  AS ENUM ('brouillon', 'planifiee', 'en_attente_validation',
                                                'validee', 'realisee', 'annulee', 'refusee');
        CREATE TYPE irrigation_method  AS ENUM ('arrosage_manuel', 'goutte_a_goutte', 'aspersion',
                                                'gravitaire', 'tuyau', 'pompe', 'autre');
        CREATE TYPE priority_level     AS ENUM ('faible', 'normale', 'elevee', 'critique');
        CREATE TYPE schedule_status    AS ENUM ('planifiee', 'realisee', 'reportee', 'annulee');

        CREATE TYPE activity_type      AS ENUM ('preparation_sol', 'semis', 'repiquage', 'fertilisation',
                                                'traitement', 'desherbage', 'irrigation', 'entretien',
                                                'recolte', 'observation', 'nettoyage', 'autre');

        CREATE TYPE input_category     AS ENUM ('semence', 'engrais', 'compost', 'produit_phytosanitaire',
                                                'carburant', 'consommable', 'tuyau', 'piece_pompe',
                                                'traitement_eau');
        CREATE TYPE stock_movement_type AS ENUM ('stock_initial', 'entree', 'sortie', 'consommation', 'ajustement');

        CREATE TYPE expense_category   AS ENUM ('semences', 'engrais', 'carburant', 'reparation_pompe',
                                                'materiel', 'main_oeuvre', 'transport',
                                                'energie_electrique', 'achat_eau', 'traitement');

        CREATE TYPE alert_type         AS ENUM ('eau_critique', 'stock_critique', 'campagne_a_risque', 'systeme');
        CREATE TYPE alert_severity     AS ENUM ('info', 'avertissement', 'critique');
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        DROP TYPE IF EXISTS alert_severity, alert_type CASCADE;
        DROP TYPE IF EXISTS expense_category CASCADE;
        DROP TYPE IF EXISTS stock_movement_type, input_category CASCADE;
        DROP TYPE IF EXISTS activity_type CASCADE;
        DROP TYPE IF EXISTS schedule_status, priority_level, irrigation_method, irrigation_status CASCADE;
        DROP TYPE IF EXISTS water_movement_type, water_source_status, water_source_type CASCADE;
        DROP TYPE IF EXISTS campaign_status CASCADE;
        DROP TYPE IF EXISTS input_status, crop_status, plot_status CASCADE;
        DROP TYPE IF EXISTS farm_status CASCADE;
        DROP TYPE IF EXISTS water_unit, area_unit CASCADE;
        SQL);
    }
};
