<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Préférences d'interface et de notification, propres à chaque compte.
 *
 * Le JSON reste volontairement souple : les préférences ne participent pas aux
 * règles métier, elles ne justifient donc pas une table dédiée.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

        COMMENT ON COLUMN users.preferences IS 'Préférences du compte : notifications, apparence.';
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        ALTER TABLE users DROP COLUMN IF EXISTS preferences;
        SQL);
    }
};
