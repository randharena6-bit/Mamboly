<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Table irrigation_schedules (AgriWater, CDC § 12). */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
        CREATE TABLE irrigation_schedules (
            id                  bigserial PRIMARY KEY,
            farm_id             bigint        NOT NULL,
            campaign_id         bigint        NOT NULL,
            plot_id             bigint        NOT NULL,
            water_source_id     bigint        NOT NULL,
            agent_id            bigint        NOT NULL,
            scheduled_date      date          NOT NULL,
            scheduled_time      time,
            estimated_quantity  numeric(14,2) NOT NULL,
            priority            priority_level NOT NULL DEFAULT 'normale',
            status              schedule_status NOT NULL DEFAULT 'planifiee',
            comment             text,
            created_at          timestamptz   NOT NULL DEFAULT now(),
            updated_at          timestamptz   NOT NULL DEFAULT now(),
            CONSTRAINT irrigation_schedules_farm_id_fkey         FOREIGN KEY (farm_id)         REFERENCES farms (id)         ON DELETE CASCADE,
            CONSTRAINT irrigation_schedules_campaign_id_fkey     FOREIGN KEY (campaign_id)     REFERENCES campaigns (id)     ON DELETE RESTRICT,
            CONSTRAINT irrigation_schedules_plot_id_fkey         FOREIGN KEY (plot_id)         REFERENCES plots (id)         ON DELETE RESTRICT,
            CONSTRAINT irrigation_schedules_water_source_id_fkey FOREIGN KEY (water_source_id) REFERENCES water_sources (id) ON DELETE RESTRICT,
            CONSTRAINT irrigation_schedules_agent_id_fkey        FOREIGN KEY (agent_id)        REFERENCES users (id)         ON DELETE RESTRICT,
            CONSTRAINT irrigation_schedules_estimated_check CHECK (estimated_quantity > 0)
        );

        COMMENT ON TABLE irrigation_schedules IS 'Intentions d''irrigation. N''a aucun effet sur le stock d''eau.';
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        DROP TABLE IF EXISTS irrigation_schedules CASCADE;
        SQL);
    }
};
