<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Table plots (AgriWater, CDC § 12). */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
        CREATE TABLE plots (
            id              bigserial PRIMARY KEY,
            farm_id         bigint       NOT NULL,
            code            varchar(50)  NOT NULL,
            name            varchar(150) NOT NULL,
            area            numeric(12,2) NOT NULL,
            area_unit       area_unit    NOT NULL DEFAULT 'm2',
            location        varchar(255),
            soil_type       varchar(100),
            status          plot_status  NOT NULL DEFAULT 'disponible',
            manual_priority priority_level NOT NULL DEFAULT 'normale',   
            soil_moisture   numeric(5,2),                                
            created_at      timestamptz  NOT NULL DEFAULT now(),
            updated_at      timestamptz  NOT NULL DEFAULT now(),
            CONSTRAINT plots_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE,
            CONSTRAINT plots_farm_code_key UNIQUE (farm_id, code),   
            CONSTRAINT plots_area_check CHECK (area > 0),
            CONSTRAINT plots_moisture_check CHECK (soil_moisture IS NULL OR soil_moisture BETWEEN 0 AND 100)
        );

        COMMENT ON TABLE plots IS 'Parcelles. manual_priority et soil_moisture alimentent le score de priorité § 6.10.';
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        DROP TABLE IF EXISTS plots CASCADE;
        SQL);
    }
};
