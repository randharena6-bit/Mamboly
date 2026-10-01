<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Table revenues (AgriWater, CDC § 12). */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
        CREATE TABLE revenues (
            id           bigserial PRIMARY KEY,
            farm_id      bigint NOT NULL,
            campaign_id  bigint,
            harvest_id   bigint,
            user_id      bigint NOT NULL,
            revenue_date date   NOT NULL,
            amount       numeric(12,2) NOT NULL,
            product      varchar(150),
            quantity     numeric(12,2),
            unit         varchar(20),
            client       varchar(150),
            comment      text,
            created_at   timestamptz NOT NULL DEFAULT now(),
            updated_at   timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT revenues_farm_id_fkey     FOREIGN KEY (farm_id)    REFERENCES farms (id)    ON DELETE CASCADE,
            CONSTRAINT revenues_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE SET NULL,
            CONSTRAINT revenues_harvest_id_fkey  FOREIGN KEY (harvest_id)  REFERENCES harvests (id)  ON DELETE SET NULL,
            CONSTRAINT revenues_user_id_fkey     FOREIGN KEY (user_id)    REFERENCES users (id)    ON DELETE RESTRICT,
            CONSTRAINT revenues_amount_check   CHECK (amount > 0),
            CONSTRAINT revenues_quantity_check CHECK (quantity IS NULL OR quantity > 0)
        );

        COMMENT ON TABLE revenues IS 'Recettes. Marge simplifiée = SUM(revenues.amount) - SUM(expenses.amount).';
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        DROP TABLE IF EXISTS revenues CASCADE;
        SQL);
    }
};
