<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

/**
 * Pack d'optimisation PostgreSQL « gold » (index, statistiques étendues,
 * réglages de stockage, vue matérialisée analytique).
 *
 * Exécute database/optimizations.sql. À lancer après toutes les migrations
 * de tables, d'index et de routines.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(File::get(database_path('optimizations.sql')));
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        DROP FUNCTION IF EXISTS agriwater_refresh_analytics() CASCADE;
        DROP MATERIALIZED VIEW IF EXISTS mv_water_consumption_daily CASCADE;

        DROP STATISTICS IF EXISTS campaigns_farm_status_stats;
        DROP STATISTICS IF EXISTS water_sources_farm_status_stats;
        DROP STATISTICS IF EXISTS irrigations_farm_status_stats;
        DROP STATISTICS IF EXISTS plots_farm_status_stats;
        DROP STATISTICS IF EXISTS alerts_farm_read_stats;

        ALTER TABLE water_sources SET (fillfactor = 100, autovacuum_vacuum_scale_factor = 0.2, autovacuum_analyze_scale_factor = 0.1);
        ALTER TABLE inputs        SET (fillfactor = 100, autovacuum_vacuum_scale_factor = 0.2, autovacuum_analyze_scale_factor = 0.1);
        ALTER TABLE campaigns     SET (fillfactor = 100);
        ALTER TABLE plots         SET (fillfactor = 100);
        ALTER TABLE users         SET (fillfactor = 100);
        SQL);
    }
};
