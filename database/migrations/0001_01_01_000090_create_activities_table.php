<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Table activities (AgriWater, CDC § 12). */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
        CREATE TABLE activities (
            id            bigserial PRIMARY KEY,
            farm_id       bigint      NOT NULL,
            campaign_id   bigint,
            plot_id       bigint      NOT NULL,
            user_id       bigint      NOT NULL,
            type          activity_type NOT NULL,
            activity_date date        NOT NULL,
            description   text,
            cost          numeric(12,2),
            created_at    timestamptz NOT NULL DEFAULT now(),
            updated_at    timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT activities_farm_id_fkey     FOREIGN KEY (farm_id)   REFERENCES farms (id)     ON DELETE CASCADE,
            CONSTRAINT activities_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE SET NULL,
            CONSTRAINT activities_plot_id_fkey     FOREIGN KEY (plot_id)   REFERENCES plots (id)     ON DELETE RESTRICT,
            CONSTRAINT activities_user_id_fkey     FOREIGN KEY (user_id)   REFERENCES users (id)     ON DELETE RESTRICT,
            CONSTRAINT activities_cost_check CHECK (cost IS NULL OR cost >= 0)
        );

        COMMENT ON TABLE activities IS 'Activités techniques : semis, fertilisation, récolte, irrigation…';
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        DROP TABLE IF EXISTS activities CASCADE;
        SQL);
    }
};
