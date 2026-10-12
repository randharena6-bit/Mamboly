<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Géolocalisation des ressources en eau (couche carte & vue 3D). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('water_sources', function (Blueprint $table) {
            $table->decimal('latitude', 9, 6)->nullable();
            $table->decimal('longitude', 9, 6)->nullable();
        });

        DB::unprepared(<<<'SQL'
        ALTER TABLE water_sources
            ADD CONSTRAINT water_sources_latitude_check CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
            ADD CONSTRAINT water_sources_longitude_check CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        ALTER TABLE water_sources
            DROP CONSTRAINT IF EXISTS water_sources_latitude_check,
            DROP CONSTRAINT IF EXISTS water_sources_longitude_check;
        SQL);

        Schema::table('water_sources', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude']);
        });
    }
};
