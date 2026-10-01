<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Table alerts (AgriWater, CDC § 12). */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
        CREATE TABLE alerts (
            id              bigserial PRIMARY KEY,
            farm_id         bigint NOT NULL,
            water_source_id bigint,
            input_id        bigint,
            campaign_id     bigint,
            type            alert_type     NOT NULL,
            severity        alert_severity NOT NULL DEFAULT 'avertissement',
            title           varchar(200)   NOT NULL,
            message         text           NOT NULL,
            is_read         boolean        NOT NULL DEFAULT false,
            read_at         timestamptz,
            created_at      timestamptz    NOT NULL DEFAULT now(),
            CONSTRAINT alerts_farm_id_fkey         FOREIGN KEY (farm_id)         REFERENCES farms (id)         ON DELETE CASCADE,
            CONSTRAINT alerts_water_source_id_fkey FOREIGN KEY (water_source_id) REFERENCES water_sources (id) ON DELETE CASCADE,
            CONSTRAINT alerts_input_id_fkey        FOREIGN KEY (input_id)        REFERENCES inputs (id)        ON DELETE CASCADE,
            CONSTRAINT alerts_campaign_id_fkey     FOREIGN KEY (campaign_id)     REFERENCES campaigns (id)     ON DELETE CASCADE,
            
            CONSTRAINT alerts_single_target_check CHECK (
                num_nonnulls(water_source_id, input_id, campaign_id) = 1
            ),
            CONSTRAINT alerts_read_check CHECK (
                (is_read = false AND read_at IS NULL) OR (is_read = true AND read_at IS NOT NULL)
            )
        );

        COMMENT ON TABLE alerts IS 'Alertes : eau critique, stock critique, campagne à risque, système.';
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        DROP TABLE IF EXISTS alerts CASCADE;
        SQL);
    }
};
