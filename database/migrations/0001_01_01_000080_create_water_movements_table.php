<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Table water_movements (AgriWater, CDC § 12). */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
        CREATE TABLE water_movements (
            id              bigserial PRIMARY KEY,
            farm_id         bigint       NOT NULL,
            water_source_id bigint       NOT NULL,
            campaign_id     bigint,
            irrigation_id   bigint,
            user_id         bigint       NOT NULL,
            type            water_movement_type NOT NULL,
            quantity        numeric(14,2) NOT NULL,
            quantity_before numeric(14,2) NOT NULL,
            quantity_after  numeric(14,2) NOT NULL,
            movement_date   timestamptz  NOT NULL DEFAULT now(),
            note            text,
            created_at      timestamptz  NOT NULL DEFAULT now(),
            CONSTRAINT water_movements_farm_id_fkey         FOREIGN KEY (farm_id)         REFERENCES farms (id)         ON DELETE CASCADE,
            CONSTRAINT water_movements_water_source_id_fkey FOREIGN KEY (water_source_id) REFERENCES water_sources (id) ON DELETE RESTRICT,
            CONSTRAINT water_movements_campaign_id_fkey     FOREIGN KEY (campaign_id)     REFERENCES campaigns (id)     ON DELETE SET NULL,
            CONSTRAINT water_movements_irrigation_id_fkey   FOREIGN KEY (irrigation_id)   REFERENCES irrigations (id)   ON DELETE CASCADE,
            CONSTRAINT water_movements_user_id_fkey         FOREIGN KEY (user_id)         REFERENCES users (id)         ON DELETE RESTRICT,
            
            CONSTRAINT water_movements_quantity_check CHECK (quantity > 0),
            CONSTRAINT water_movements_before_check CHECK (quantity_before >= 0),
            CONSTRAINT water_movements_after_check  CHECK (quantity_after  >= 0),
            CONSTRAINT water_movements_delta_check
                CHECK (quantity_after = quantity_before + quantity
                    OR quantity_after = quantity_before - quantity)
        );

        COMMENT ON TABLE water_movements IS 'Journal append-only. Une entrée par variation de water_sources.available_quantity (RM-09).';
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        DROP TABLE IF EXISTS water_movements CASCADE;
        SQL);
    }
};
