<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Index de performance (AgriWater, CDC § 12). */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
        CREATE INDEX users_farm_id_index            ON users (farm_id);

        CREATE INDEX users_role_id_index            ON users (role_id);

        CREATE INDEX users_is_active_index          ON users (is_active) WHERE is_active;

        CREATE INDEX farms_manager_id_index         ON farms (manager_id);

        CREATE INDEX farms_status_index             ON farms (status);

        CREATE INDEX plots_farm_id_status_index     ON plots (farm_id, status);

        CREATE INDEX campaigns_farm_id_status_index ON campaigns (farm_id, status);

        CREATE INDEX campaigns_plot_id_index        ON campaigns (plot_id);

        CREATE INDEX campaigns_crop_id_index        ON campaigns (crop_id);

        CREATE INDEX campaigns_manager_id_index     ON campaigns (manager_id);

        CREATE INDEX campaigns_dates_index          ON campaigns (farm_id, start_date, expected_end_date);

        CREATE INDEX water_sources_farm_id_status_index ON water_sources (farm_id, status);

        CREATE INDEX water_sources_critical_index    ON water_sources (farm_id)
            WHERE status = 'active' AND available_quantity <= critical_threshold;

        CREATE INDEX irrigations_farm_performed_index ON irrigations (farm_id, performed_at DESC);

        CREATE INDEX irrigations_campaign_id_index   ON irrigations (campaign_id);

        CREATE INDEX irrigations_plot_id_index       ON irrigations (plot_id);

        CREATE INDEX irrigations_water_source_index  ON irrigations (water_source_id);

        CREATE INDEX irrigations_status_index        ON irrigations (farm_id, status);

        CREATE INDEX irrigations_performed_by_index  ON irrigations (performed_by);

        CREATE INDEX irrigation_schedules_date_index ON irrigation_schedules (farm_id, scheduled_date);

        CREATE INDEX irrigation_schedules_agent_index ON irrigation_schedules (agent_id);

        CREATE INDEX water_movements_source_date_index ON water_movements (water_source_id, movement_date DESC);

        CREATE INDEX water_movements_campaign_index     ON water_movements (campaign_id);

        CREATE INDEX water_movements_irrigation_index   ON water_movements (irrigation_id);

        CREATE INDEX water_movements_type_index         ON water_movements (type);

        CREATE INDEX activities_farm_date_index   ON activities (farm_id, activity_date DESC);

        CREATE INDEX activities_campaign_index    ON activities (campaign_id);

        CREATE INDEX activities_plot_index        ON activities (plot_id);

        CREATE INDEX inputs_farm_id_index         ON inputs (farm_id);

        CREATE INDEX stock_movements_input_index  ON stock_movements (input_id, movement_date DESC);

        CREATE INDEX harvests_campaign_index      ON harvests (campaign_id);

        CREATE INDEX harvests_plot_index          ON harvests (plot_id);

        CREATE INDEX expenses_farm_date_index     ON expenses (farm_id, expense_date DESC);

        CREATE INDEX expenses_category_index      ON expenses (category);

        CREATE INDEX revenues_farm_date_index     ON revenues (farm_id, revenue_date DESC);

        CREATE INDEX revenues_campaign_index      ON revenues (campaign_id);

        CREATE INDEX revenues_harvest_index       ON revenues (harvest_id);

        CREATE INDEX alerts_farm_unread_index      ON alerts (farm_id, created_at DESC) WHERE is_read = false;

        CREATE INDEX alerts_water_source_index     ON alerts (water_source_id);

        CREATE INDEX activity_logs_entity_index    ON activity_logs (entity_type, entity_id);

        CREATE INDEX activity_logs_farm_date_index ON activity_logs (farm_id, created_at DESC);

        CREATE INDEX activity_logs_user_index      ON activity_logs (user_id);

        CREATE INDEX sessions_last_activity_index  ON sessions (last_activity);

        CREATE INDEX sessions_user_id_index        ON sessions (user_id);

        -- `jobs.queue` et `cache.expiration` sont déjà indexés par les
        -- migrations de Laravel (`->index()`), qui nomment l'index exactement
        -- `jobs_queue_index` et `cache_expiration_index`. Les recréer ici
        -- ferait échouer `migrate:fresh` sur un doublon.
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        -- les index sont supprimés avec leurs tables;
        SQL);
    }
};
