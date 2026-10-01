<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Table inputs (AgriWater, CDC § 12). */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
        CREATE TABLE inputs (
            id                 bigserial PRIMARY KEY,
            farm_id            bigint         NOT NULL,
            name               varchar(150)   NOT NULL,
            category           input_category NOT NULL,
            unit               varchar(20)    NOT NULL DEFAULT 'kg',
            minimum_threshold  numeric(12,2)  NOT NULL DEFAULT 0,
            available_quantity numeric(12,2)  NOT NULL DEFAULT 0,
            unit_price         numeric(12,2)  NOT NULL DEFAULT 0,
            supplier           varchar(150),
            status             input_status   NOT NULL DEFAULT 'actif',
            created_at         timestamptz    NOT NULL DEFAULT now(),
            updated_at         timestamptz    NOT NULL DEFAULT now(),
            CONSTRAINT inputs_farm_id_fkey     FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE,
            CONSTRAINT inputs_farm_name_key    UNIQUE (farm_id, name),
            
            CONSTRAINT inputs_available_check  CHECK (available_quantity >= 0),
            CONSTRAINT inputs_threshold_check  CHECK (minimum_threshold >= 0),
            CONSTRAINT inputs_price_check      CHECK (unit_price >= 0)
        );

        COMMENT ON TABLE inputs IS 'Intrants : semences, engrais, produits phytosanitaires, carburant…';
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        DROP TABLE IF EXISTS inputs CASCADE;
        SQL);
    }
};
