<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Table harvests (AgriWater, CDC § 12). */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
        CREATE TABLE harvests (
            id            bigserial PRIMARY KEY,
            farm_id       bigint       NOT NULL,
            campaign_id   bigint       NOT NULL,
            plot_id       bigint       NOT NULL,
            user_id       bigint       NOT NULL,
            product       varchar(150) NOT NULL,
            harvest_date  date         NOT NULL,
            quantity      numeric(12,2) NOT NULL,
            unit          varchar(20)  NOT NULL DEFAULT 'kg',
            quality       varchar(50),
            loss_quantity numeric(12,2) NOT NULL DEFAULT 0,
            observation   text,
            created_at    timestamptz  NOT NULL DEFAULT now(),
            updated_at    timestamptz  NOT NULL DEFAULT now(),
            CONSTRAINT harvests_farm_id_fkey     FOREIGN KEY (farm_id)   REFERENCES farms (id)   ON DELETE CASCADE,
            CONSTRAINT harvests_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE RESTRICT,
            CONSTRAINT harvests_plot_id_fkey     FOREIGN KEY (plot_id)   REFERENCES plots (id)   ON DELETE RESTRICT,
            CONSTRAINT harvests_user_id_fkey     FOREIGN KEY (user_id)   REFERENCES users (id)   ON DELETE RESTRICT,
            CONSTRAINT harvests_quantity_check CHECK (quantity > 0),
            CONSTRAINT harvests_loss_check     CHECK (loss_quantity >= 0 AND loss_quantity <= quantity)
        );

        COMMENT ON TABLE harvests IS 'Récoltes réalisées. La quantité vendue est plafonnée par la récolte (RM-13).';
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        DROP TABLE IF EXISTS harvests CASCADE;
        SQL);
    }
};
