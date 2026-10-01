<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Table irrigations (AgriWater, CDC § 12). */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
        CREATE TABLE irrigations (
            id                bigserial PRIMARY KEY,
            farm_id           bigint       NOT NULL,
            campaign_id       bigint       NOT NULL,
            plot_id           bigint       NOT NULL,
            water_source_id   bigint       NOT NULL,
            performed_by      bigint       NOT NULL,
            validated_by      bigint,                    
            scheduled_at      timestamptz,
            performed_at      timestamptz  NOT NULL DEFAULT now(),
            quantity          numeric(14,2) NOT NULL,
            unit              water_unit   NOT NULL DEFAULT 'L',
            duration_minutes  integer,
            method            irrigation_method NOT NULL,
            status            irrigation_status  NOT NULL DEFAULT 'brouillon',
            observation       text,
            created_at        timestamptz  NOT NULL DEFAULT now(),
            updated_at        timestamptz  NOT NULL DEFAULT now(),
            CONSTRAINT irrigations_farm_id_fkey          FOREIGN KEY (farm_id)         REFERENCES farms (id)         ON DELETE CASCADE,
            CONSTRAINT irrigations_campaign_id_fkey      FOREIGN KEY (campaign_id)     REFERENCES campaigns (id)     ON DELETE RESTRICT,
            CONSTRAINT irrigations_plot_id_fkey          FOREIGN KEY (plot_id)         REFERENCES plots (id)         ON DELETE RESTRICT,
            CONSTRAINT irrigations_water_source_id_fkey  FOREIGN KEY (water_source_id) REFERENCES water_sources (id) ON DELETE RESTRICT,
            CONSTRAINT irrigations_performed_by_fkey     FOREIGN KEY (performed_by)    REFERENCES users (id)         ON DELETE RESTRICT,
            CONSTRAINT irrigations_validated_by_fkey     FOREIGN KEY (validated_by)    REFERENCES users (id)         ON DELETE SET NULL,
            
            CONSTRAINT irrigations_quantity_check CHECK (quantity > 0),
            CONSTRAINT irrigations_duration_check CHECK (duration_minutes IS NULL OR duration_minutes > 0)
        );

        COMMENT ON TABLE irrigations IS 'Séances d''irrigation. Toute ligne consomme le stock de sa ressource (RM-04).';
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        DROP TABLE IF EXISTS irrigations CASCADE;
        SQL);
    }
};
