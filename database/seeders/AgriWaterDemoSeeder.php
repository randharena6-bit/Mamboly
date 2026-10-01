<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

/**
 * Charge le jeu de démonstration AgriWater (CDC § 19) depuis
 * database/seed/agriwater_demo.sql.
 *
 * Le fichier SQL est transactionnel (BEGIN/COMMIT) et suppose le schéma
 * PostgreSQL déjà créé (migrations). Il contient des blocs PL/pgSQL ($$),
 * donc on l'exécute via DB::unprepared et non via des requêtes préparées.
 */
class AgriWaterDemoSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('seed/agriwater_demo.sql');

        if (! File::exists($path)) {
            $this->command?->error("Fichier introuvable : {$path}");

            return;
        }

        $this->command?->info('Chargement du jeu de démonstration AgriWater…');

        DB::unprepared(File::get($path));

        $this->refreshAnalytics();

        $this->command?->info('Jeu de démonstration AgriWater chargé.');
    }

    /**
     * Recalcule les vues matérialisées analytiques (pack d'optimisation),
     * si celui-ci a été appliqué.
     */
    protected function refreshAnalytics(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        $fn = DB::selectOne("SELECT to_regprocedure('agriwater_refresh_analytics()') AS p");

        if ($fn !== null && $fn->p !== null) {
            DB::statement('SELECT agriwater_refresh_analytics()');
        }
    }
}
