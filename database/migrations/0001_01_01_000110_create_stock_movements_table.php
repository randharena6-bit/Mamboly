<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Table stock_movements (AgriWater, CDC § 12). */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
        CREATE TABLE stock_movements (
            id            bigserial PRIMARY KEY,
            farm_id       bigint   NOT NULL,
            input_id      bigint   NOT NULL,
            campaign_id   bigint,
            user_id       bigint   NOT NULL,
            type          stock_movement_type NOT NULL,
            quantity      numeric(12,2) NOT NULL,
            stock_before  numeric(12,2) NOT NULL,
            stock_after   numeric(12,2) NOT NULL,
            movement_date timestamptz NOT NULL DEFAULT now(),
            note          text,
            created_at    timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT stock_movements_farm_id_fkey   FOREIGN KEY (farm_id)   REFERENCES farms (id)   ON DELETE CASCADE,
            CONSTRAINT stock_movements_input_id_fkey  FOREIGN KEY (input_id)  REFERENCES inputs (id)  ON DELETE RESTRICT,
            CONSTRAINT stock_movements_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE SET NULL,
            CONSTRAINT stock_movements_user_id_fkey   FOREIGN KEY (user_id)   REFERENCES users (id)   ON DELETE RESTRICT,
            CONSTRAINT stock_movements_quantity_check CHECK (quantity > 0),
            CONSTRAINT stock_movements_stock_check    CHECK (stock_before >= 0 AND stock_after >= 0),
            CONSTRAINT stock_movements_delta_check
                CHECK (stock_after = stock_before + quantity OR stock_after = stock_before - quantity)
        );

        COMMENT ON TABLE stock_movements IS 'Historique des mouvements d''intrants (entrée, sortie, consommation).';
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        DROP TABLE IF EXISTS stock_movements CASCADE;
        SQL);
    }
};
