<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Table notifications (AgriWater, CDC § 12). */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
        CREATE TABLE notifications (
            uuid            uuid PRIMARY KEY,
            type            varchar(255) NOT NULL,
            notifiable_type varchar(255) NOT NULL,
            notifiable_id   bigint      NOT NULL,
            data            text        NOT NULL,
            read_at         timestamptz,
            created_at      timestamptz
        );
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        DROP TABLE IF EXISTS notifications CASCADE;
        SQL);
    }
};
