<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Table water_sources (AgriWater, CDC § 12). */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
        CREATE TABLE water_sources (
            id                  bigserial PRIMARY KEY,
            farm_id             bigint        NOT NULL,
            name                varchar(150)  NOT NULL,
            type                water_source_type NOT NULL,
            capacity            numeric(14,2) NOT NULL,
            available_quantity  numeric(14,2) NOT NULL DEFAULT 0,
            unit                water_unit    NOT NULL DEFAULT 'L',
            critical_threshold  numeric(14,2) NOT NULL DEFAULT 0,
            location            varchar(255),
            status              water_source_status NOT NULL DEFAULT 'active',
            created_at          timestamptz   NOT NULL DEFAULT now(),
            updated_at          timestamptz   NOT NULL DEFAULT now(),
            CONSTRAINT water_sources_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE,
            CONSTRAINT water_sources_farm_name_key UNIQUE (farm_id, name),
            
            CONSTRAINT water_sources_available_check CHECK (available_quantity >= 0),
            
            CONSTRAINT water_sources_capacity_check CHECK (available_quantity <= capacity),
            CONSTRAINT water_sources_capacity_positive_check CHECK (capacity > 0),
            
            CONSTRAINT water_sources_threshold_check CHECK (critical_threshold >= 0 AND critical_threshold <= capacity)
        );

        COMMENT ON TABLE water_sources IS 'Ressources en eau. Contrainte centrale du projet : available_quantity >= 0 (RM-04).';
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        DROP TABLE IF EXISTS water_sources CASCADE;
        SQL);
    }
};
