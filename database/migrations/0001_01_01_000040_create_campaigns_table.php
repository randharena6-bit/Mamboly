<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Table campaigns (AgriWater, CDC § 12). */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
        CREATE TABLE campaigns (
            id                bigserial PRIMARY KEY,
            farm_id           bigint       NOT NULL,
            plot_id           bigint       NOT NULL,
            crop_id           bigint       NOT NULL,
            manager_id        bigint,
            code              varchar(60)  NOT NULL,
            name              varchar(150) NOT NULL,
            start_date        date         NOT NULL,
            expected_end_date date         NOT NULL,
            actual_end_date   date,
            area              numeric(12,2) NOT NULL,
            status            campaign_status NOT NULL DEFAULT 'planifiee',
            notes             text,
            created_at        timestamptz  NOT NULL DEFAULT now(),
            updated_at        timestamptz  NOT NULL DEFAULT now(),
            CONSTRAINT campaigns_farm_id_fkey  FOREIGN KEY (farm_id)  REFERENCES farms (id)  ON DELETE CASCADE,
            CONSTRAINT campaigns_plot_id_fkey  FOREIGN KEY (plot_id)  REFERENCES plots (id)  ON DELETE RESTRICT,
            CONSTRAINT campaigns_crop_id_fkey  FOREIGN KEY (crop_id)  REFERENCES crops (id)  ON DELETE RESTRICT,
            CONSTRAINT campaigns_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES users (id) ON DELETE SET NULL,
            CONSTRAINT campaigns_farm_code_key UNIQUE (farm_id, code),
            CONSTRAINT campaigns_area_check CHECK (area > 0),
            CONSTRAINT campaigns_dates_check CHECK (expected_end_date >= start_date),
            CONSTRAINT campaigns_actual_end_check CHECK (actual_end_date IS NULL OR actual_end_date >= start_date)
        );

        COMMENT ON TABLE campaigns IS 'Campagnes agricoles : production d''une culture sur une parcelle et une période.';
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        DROP TABLE IF EXISTS campaigns CASCADE;
        SQL);
    }
};
