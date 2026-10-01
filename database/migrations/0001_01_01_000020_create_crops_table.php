<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Table crops (AgriWater, CDC § 12). */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
        CREATE TABLE crops (
            id                      bigserial PRIMARY KEY,
            name                    varchar(100) NOT NULL,
            category                varchar(50)  NOT NULL,
            estimated_duration_days integer      NOT NULL,
            water_requirement       numeric(10,2) NOT NULL DEFAULT 0,
            production_unit         varchar(30)  NOT NULL DEFAULT 'kg',
            status                  crop_status  NOT NULL DEFAULT 'actif',
            created_at              timestamptz  NOT NULL DEFAULT now(),
            updated_at              timestamptz  NOT NULL DEFAULT now(),
            CONSTRAINT crops_name_key UNIQUE (name),
            CONSTRAINT crops_duration_check CHECK (estimated_duration_days > 0),
            CONSTRAINT crops_water_requirement_check CHECK (water_requirement >= 0)
        );

        COMMENT ON TABLE crops IS 'Catalogue global des cultures et de leur besoin en eau (module priorité § 6.10).';
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        DROP TABLE IF EXISTS crops CASCADE;
        SQL);
    }
};
