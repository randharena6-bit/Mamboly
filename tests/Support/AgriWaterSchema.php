<?php

namespace Tests\Support;

use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Prépare la base PostgreSQL des tests AgriWater avant un `migrate:fresh`.
 *
 * Deux écarts entre le schéma de référence et le cycle des migrations :
 *
 * - le schéma `agriwater` est créé par `database/schema.sql`, pas par une
 *   migration ; une base de test neuve ne l'a donc jamais eu ;
 * - `migrate:fresh` ne supprime que les tables. Les ENUM, les domaines et les
 *   vues matérialisées survivent, et la migration qui les crée échoue ensuite
 *   sur un « type already exists ».
 *
 * `RefreshDatabase::beforeRefreshingDatabase()` est le point d'entrée prévu
 * pour cela : il s'exécute avant le vidage, sur une base encore_connectée.
 */
class AgriWaterSchema
{
    public static function ensureExists(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            throw new RuntimeException(
                'Le schéma AgriWater requiert PostgreSQL. DB_CONNECTION doit valoir « pgsql » en test.'
            );
        }

        $schema = self::schema();

        DB::statement("CREATE SCHEMA IF NOT EXISTS {$schema}");
        self::dropMaterializedViews($schema);
        self::dropCustomTypes($schema);
    }

    /**
     * Schéma applicatif : `DB_SEARCH_PATH` accepte une liste séparée par des
     * virgules (« agriwater,public »), seul le premier porte les objets métier.
     */
    private static function schema(): string
    {
        return str((string) config('database.connections.pgsql.search_path', 'public'))
            ->trim()
            ->explode(',')
            ->first()
            ?? 'public';
    }

    /** Les vues matérialisées doivent tomber avant, une table/index ne suffit pas. */
    private static function dropMaterializedViews(string $schema): void
    {
        DB::statement(<<<SQL
            DO \$\$
            DECLARE vue record;
            BEGIN
                FOR vue IN
                    SELECT matviewname FROM pg_matviews WHERE schemaname = '{$schema}'
                LOOP
                    EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS %I CASCADE', vue.matviewname);
                END LOOP;
            END
            \$\$;
            SQL);
    }

    /** TypesComposés de la base : ENUM ('e') et domaines ('d'). */
    private static function dropCustomTypes(string $schema): void
    {
        DB::statement(<<<SQL
            DO \$\$
            DECLARE type record;
            BEGIN
                FOR type IN
                    SELECT typname FROM pg_type
                    WHERE typtype IN ('e', 'd')
                      AND typnamespace = '{$schema}'::regnamespace
                LOOP
                    EXECUTE format('DROP TYPE IF EXISTS %I CASCADE', type.typname);
                END LOOP;
            END
            \$\$;
            SQL);
    }
}
