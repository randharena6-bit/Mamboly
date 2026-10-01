<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Table expenses (AgriWater, CDC § 12). */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
        CREATE TABLE expenses (
            id           bigserial PRIMARY KEY,
            farm_id      bigint NOT NULL,
            campaign_id  bigint,
            user_id      bigint NOT NULL,
            expense_date date   NOT NULL,
            amount       numeric(12,2) NOT NULL,
            category     expense_category NOT NULL,
            description  text,
            receipt_path varchar(255),
            created_at   timestamptz NOT NULL DEFAULT now(),
            updated_at   timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT expenses_farm_id_fkey     FOREIGN KEY (farm_id)    REFERENCES farms (id)    ON DELETE CASCADE,
            CONSTRAINT expenses_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE SET NULL,
            CONSTRAINT expenses_user_id_fkey     FOREIGN KEY (user_id)    REFERENCES users (id)    ON DELETE RESTRICT,
            CONSTRAINT expenses_amount_check CHECK (amount > 0)
        );

        COMMENT ON TABLE expenses IS 'Dépenses de l''exploitation (semences, carburant, main-d''œuvre…).';
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        DROP TABLE IF EXISTS expenses CASCADE;
        SQL);
    }
};
