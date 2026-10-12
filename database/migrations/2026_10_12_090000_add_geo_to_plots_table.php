<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Géolocalisation des parcelles (carte & vue 3D). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plots', function (Blueprint $table) {
            $table->decimal('latitude', 9, 6)->nullable()->after('location');
            $table->decimal('longitude', 9, 6)->nullable()->after('latitude');
            $table->jsonb('boundary')->nullable()->after('longitude');
        });

        DB::unprepared(<<<'SQL'
        ALTER TABLE plots
            ADD CONSTRAINT plots_latitude_check CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
            ADD CONSTRAINT plots_longitude_check CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        ALTER TABLE plots
            DROP CONSTRAINT IF EXISTS plots_latitude_check,
            DROP CONSTRAINT IF EXISTS plots_longitude_check;
        SQL);

        Schema::table('plots', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude', 'boundary']);
        });
    }
};
