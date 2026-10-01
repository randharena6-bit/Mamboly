<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Table activity_logs (AgriWater, CDC § 12). */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
        CREATE TABLE activity_logs (
            id          bigserial PRIMARY KEY,
            farm_id     bigint,
            user_id     bigint,
            action      varchar(100) NOT NULL,
            entity_type varchar(100) NOT NULL,
            entity_id   bigint      NOT NULL,
            description text,
            ip_address  inet,
            user_agent  varchar(255),
            created_at  timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT activity_logs_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE SET NULL,
            CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
        );

        COMMENT ON TABLE activity_logs IS 'Journal d''audit des accès et opérations sensibles (tentative de fuite inter-exploitation…).';
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        DROP TABLE IF EXISTS activity_logs CASCADE;
        SQL);
    }
};
