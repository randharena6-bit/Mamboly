<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/** Fonctions, déclencheurs (règles métier RM) et vues du tableau de bord (CDC § 7, § 9). */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
        CREATE OR REPLACE FUNCTION agriwater_set_updated_at() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
            NEW.updated_at := now();
            RETURN NEW;
        END;
        $$;

        CREATE OR REPLACE FUNCTION agriwater_to_m2(area numeric, unit area_unit) RETURNS numeric
        LANGUAGE sql IMMUTABLE AS $$
            SELECT CASE unit WHEN 'ha' THEN area * 10000 ELSE area END;
        $$;

        CREATE OR REPLACE FUNCTION agriwater_manager_validation_threshold() RETURNS numeric
        LANGUAGE plpgsql STABLE AS $$
        DECLARE
            v text;
        BEGIN
            v := current_setting('agriwater.manager_validation_threshold', true);
            IF v IS NULL OR v = '' THEN
                RETURN 2000;                      -- valeur par défaut du CDC § 7 (RM-10)
            END IF;
            RETURN v::numeric;
        EXCEPTION WHEN OTHERS THEN
            RETURN 2000;
        END;
        $$;

        CREATE OR REPLACE FUNCTION agriwater_priority_weight(p priority_level) RETURNS integer
        LANGUAGE sql IMMUTABLE AS $$
            SELECT CASE p
                WHEN 'faible'   THEN 0
                WHEN 'normale'  THEN 10
                WHEN 'elevee'   THEN 20
                WHEN 'critique' THEN 30
            END;
        $$;

        CREATE OR REPLACE FUNCTION agriwater_check_farm_manager() RETURNS trigger
        LANGUAGE plpgsql AS $$
        DECLARE
            v_farm_id bigint;
        BEGIN
            IF NEW.manager_id IS NULL THEN
                RETURN NEW;
            END IF;

            SELECT farm_id INTO v_farm_id FROM users WHERE id = NEW.manager_id;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Introuvable : utilisateur %', NEW.manager_id
                    USING ERRCODE = 'foreign_key_violation';
            END IF;

            -- v_farm_id IS NULL = administrateur global autorisé à encadrer une exploitation
            IF v_farm_id IS NOT NULL AND v_farm_id IS DISTINCT FROM NEW.id THEN
                RAISE EXCEPTION
                    'RM-01 : l''utilisateur % (exploitation %) ne peut pas être responsable de l''exploitation %',
                    NEW.manager_id, v_farm_id, NEW.id
                    USING ERRCODE = 'check_violation';
            END IF;

            RETURN NEW;
        END;
        $$;

        CREATE OR REPLACE FUNCTION agriwater_check_campaign_plot() RETURNS trigger
        LANGUAGE plpgsql AS $$
        DECLARE
            v_farm_id bigint;
        BEGIN
            SELECT farm_id INTO v_farm_id FROM plots WHERE id = NEW.plot_id;
            IF v_farm_id IS NULL THEN
                RAISE EXCEPTION 'RM-07 : parcelle % introuvable pour la campagne %', NEW.plot_id, NEW.code
                    USING ERRCODE = 'foreign_key_violation';
            END IF;
            IF v_farm_id IS DISTINCT FROM NEW.farm_id THEN
                RAISE EXCEPTION
                    'RM-01 : la parcelle % appartient à l''exploitation % et non à l''exploitation %',
                    NEW.plot_id, v_farm_id, NEW.farm_id
                    USING ERRCODE = 'check_violation';
            END IF;
            RETURN NEW;
        END;
        $$;

        CREATE OR REPLACE FUNCTION agriwater_check_irrigation_coherence() RETURNS trigger
        LANGUAGE plpgsql AS $$
        DECLARE
            c_campaign campaigns%ROWTYPE;
            c_plot     plots%ROWTYPE;
            c_source   water_sources%ROWTYPE;
        BEGIN
            SELECT * INTO c_campaign FROM campaigns    WHERE id = NEW.campaign_id;
            SELECT * INTO c_plot     FROM plots        WHERE id = NEW.plot_id;
            SELECT * INTO c_source   FROM water_sources WHERE id = NEW.water_source_id;

            -- RM-01 : aucun objet d'une autre exploitation
            IF c_campaign.farm_id IS DISTINCT FROM NEW.farm_id THEN
                RAISE EXCEPTION 'RM-01 : la campagne % appartient à une autre exploitation', NEW.campaign_id
                    USING ERRCODE = 'check_violation';
            END IF;
            IF c_plot.farm_id IS DISTINCT FROM NEW.farm_id THEN
                RAISE EXCEPTION 'RM-01 : la parcelle % appartient à une autre exploitation', NEW.plot_id
                    USING ERRCODE = 'check_violation';
            END IF;
            IF c_source.farm_id IS DISTINCT FROM NEW.farm_id THEN
                RAISE EXCEPTION 'RM-01 : la ressource en eau % appartient à une autre exploitation', NEW.water_source_id
                    USING ERRCODE = 'check_violation';
            END IF;

            -- RM-07 : la parcelle irriguée est celle de la campagne
            IF c_campaign.plot_id IS DISTINCT FROM NEW.plot_id THEN
                RAISE EXCEPTION
                    'RM-07 : la parcelle % ne correspond pas à la parcelle % de la campagne %',
                    NEW.plot_id, c_campaign.plot_id, NEW.campaign_id
                    USING ERRCODE = 'check_violation';
            END IF;

            -- RM-02 : ressource en eau active
            IF NEW.status IN ('validee', 'realisee') AND c_source.status <> 'active' THEN
                RAISE EXCEPTION
                    'RM-02 : la ressource « % » doit être active (statut actuel : %) pour une irrigation validée',
                    c_source.name, c_source.status
                    USING ERRCODE = 'check_violation';
            END IF;

            -- RM-06 : campagne active ou autorisée
            IF NEW.status IN ('validee', 'realisee') AND c_campaign.status NOT IN ('active', 'planifiee') THEN
                RAISE EXCEPTION
                    'RM-06 : la campagne % a le statut « % » et n''accepte plus d''irrigation',
                    c_campaign.code, c_campaign.status
                    USING ERRCODE = 'check_violation';
            END IF;

            RETURN NEW;
        END;
        $$;

        CREATE OR REPLACE FUNCTION agriwater_check_manager_validation() RETURNS trigger
        LANGUAGE plpgsql AS $$
        DECLARE
            v_seuil numeric := agriwater_manager_validation_threshold();
        BEGIN
            IF NEW.status IN ('validee', 'realisee')
               AND NEW.quantity > v_seuil
               AND NEW.validated_by IS NULL THEN
                RAISE EXCEPTION
                    'RM-10 : une irrigation de % % dépasse le seuil de % et doit être validée par un responsable (validated_by)',
                    NEW.quantity, NEW.unit, v_seuil
                    USING ERRCODE = 'check_violation';
            END IF;
            RETURN NEW;
        END;
        $$;

        CREATE OR REPLACE FUNCTION agriwater_assert_movement_trace() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
            IF NEW.available_quantity IS DISTINCT FROM OLD.available_quantity
               AND NOT EXISTS (
                    SELECT 1 FROM water_movements wm
                    WHERE wm.water_source_id = NEW.id
                      AND wm.quantity_before = OLD.available_quantity
                      AND wm.quantity_after  = NEW.available_quantity
               ) THEN
                RAISE EXCEPTION
                    'RM-09 : variation du stock de « % » (%.2f -> %.2f) sans mouvement d''eau traçable correspondant',
                    NEW.name, OLD.available_quantity, NEW.available_quantity
                    USING ERRCODE = 'check_violation';
            END IF;
            RETURN NULL;
        END;
        $$;

        CREATE OR REPLACE FUNCTION agriwater_alert_critical_water() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
            IF NEW.status = 'active'
               AND NEW.available_quantity <= NEW.critical_threshold
               AND OLD.available_quantity > OLD.critical_threshold
               AND NOT EXISTS (
                    SELECT 1 FROM alerts a
                    WHERE a.water_source_id = NEW.id
                      AND a.type = 'eau_critique'
                      AND a.is_read = false
               ) THEN
                INSERT INTO alerts (farm_id, water_source_id, type, severity, title, message)
                VALUES (
                    NEW.farm_id,
                    NEW.id,
                    'eau_critique',
                    CASE WHEN NEW.available_quantity <= NEW.critical_threshold / 2
                         THEN 'critique'::alert_severity
                         ELSE 'avertissement'::alert_severity END,
                    format('Alerte eau : niveau critique de %s', NEW.name),
                    format('Alerte eau : le niveau de %s est de %s %s. Le seuil critique est fixé à %s %s. '
                           || 'Vérifiez les irrigations prévues ou planifiez un remplissage.',
                           NEW.name, NEW.available_quantity, NEW.unit, NEW.critical_threshold, NEW.unit)
                );
            END IF;
            RETURN NULL;
        END;
        $$;

        CREATE OR REPLACE FUNCTION agriwater_check_campaign_not_closed() RETURNS trigger
        LANGUAGE plpgsql AS $$
        DECLARE
            c_campaign campaigns%ROWTYPE;
        BEGIN
            SELECT * INTO c_campaign FROM campaigns WHERE id = NEW.campaign_id;
            IF FOUND AND c_campaign.status IN ('terminee', 'annulee') THEN
                RAISE EXCEPTION
                    'RM-11 : la campagne % est % : aucune nouvelle opération (% %) n''est autorisée',
                    c_campaign.code, c_campaign.status, TG_TABLE_NAME, NEW.id
                    USING ERRCODE = 'check_violation';
            END IF;
            RETURN NEW;
        END;
        $$;

        CREATE OR REPLACE FUNCTION agriwater_check_revenue_vs_harvest() RETURNS trigger
        LANGUAGE plpgsql AS $$
        DECLARE
            h          harvests%ROWTYPE;
            v_deja     numeric := 0;
            v_restant  numeric;
        BEGIN
            IF NEW.harvest_id IS NULL OR NEW.quantity IS NULL THEN
                RETURN NEW;
            END IF;

            SELECT * INTO h FROM harvests WHERE id = NEW.harvest_id;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'RM-13 : récolte % introuvable', NEW.harvest_id
                    USING ERRCODE = 'foreign_key_violation';
            END IF;

            IF h.farm_id IS DISTINCT FROM NEW.farm_id THEN
                RAISE EXCEPTION 'RM-01 : la récolte % appartient à une autre exploitation', NEW.harvest_id
                    USING ERRCODE = 'check_violation';
            END IF;

            SELECT COALESCE(SUM(quantity), 0) INTO v_deja
              FROM revenues
             WHERE harvest_id = NEW.harvest_id
               AND (TG_OP = 'INSERT' OR id <> NEW.id);

            v_restant := h.quantity - v_deja;

            IF NEW.quantity > v_restant THEN
                RAISE EXCEPTION
                    'RM-13 : quantité vendue (%) supérieure au solde récolté de la récolte % (récolté %, déjà vendu %)',
                    NEW.quantity, NEW.harvest_id, h.quantity, v_deja
                    USING ERRCODE = 'check_violation';
            END IF;

            RETURN NEW;
        END;
        $$;

        CREATE OR REPLACE FUNCTION agriwater_check_same_farm() RETURNS trigger
        LANGUAGE plpgsql AS $$
        DECLARE
            v_table  text := TG_ARGV[0];
            v_column text := TG_ARGV[1];
            v_farm   bigint;
        BEGIN
            IF NEW.campaign_id IS NULL THEN
                RETURN NEW;
            END IF;

            EXECUTE format('SELECT farm_id FROM %I WHERE id = $1', v_table) INTO v_farm USING NEW.campaign_id;

            IF v_farm IS DISTINCT FROM NEW.farm_id THEN
                RAISE EXCEPTION 'RM-01 : l''objet % de type % appartient à l''exploitation %, pas à l''exploitation %',
                    NEW.campaign_id, v_table, v_farm, NEW.farm_id
                    USING ERRCODE = 'check_violation';
            END IF;

            RETURN NEW;
        END;
        $$;

        CREATE OR REPLACE FUNCTION agriwater_log_operation() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
            IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status
               AND TG_TABLE_NAME = 'irrigations' THEN
                RETURN NULL;
            END IF;

            INSERT INTO activity_logs (farm_id, user_id, action, entity_type, entity_id, description)
            VALUES (
                CASE WHEN TG_TABLE_NAME IN ('farms', 'users') THEN NULL ELSE NEW.farm_id END,
                NULLIF(current_setting('agriwater.user_id', true), '')::bigint,
                lower(TG_OP),
                TG_TABLE_NAME,
                NEW.id,
                format('%s sur %s (id=%s)', TG_OP, TG_TABLE_NAME, NEW.id)
            );
            RETURN NULL;
        END;
        $$;

        DO $$
        DECLARE t text;
        BEGIN
            FOREACH t IN ARRAY ARRAY[
                'roles', 'farms', 'users', 'plots', 'crops', 'campaigns', 'water_sources',
                'irrigation_schedules', 'irrigations', 'activities', 'inputs',
                'harvests', 'expenses', 'revenues'
            ] LOOP
                EXECUTE format(
                    'CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON %1$I
                     FOR EACH ROW EXECUTE FUNCTION agriwater_set_updated_at()', t);
            END LOOP;
        END;
        $$;

        CREATE TRIGGER trg_farms_manager_check
            BEFORE INSERT OR UPDATE OF manager_id ON farms
            FOR EACH ROW EXECUTE FUNCTION agriwater_check_farm_manager();

        CREATE TRIGGER trg_campaigns_plot_check
            BEFORE INSERT OR UPDATE OF plot_id, farm_id ON campaigns
            FOR EACH ROW EXECUTE FUNCTION agriwater_check_campaign_plot();

        CREATE TRIGGER trg_irrigations_coherence_check
            BEFORE INSERT OR UPDATE ON irrigations
            FOR EACH ROW EXECUTE FUNCTION agriwater_check_irrigation_coherence();

        CREATE TRIGGER trg_irrigations_manager_validation_check
            BEFORE INSERT OR UPDATE OF status, quantity, validated_by ON irrigations
            FOR EACH ROW EXECUTE FUNCTION agriwater_check_manager_validation();

        CREATE CONSTRAINT TRIGGER trg_water_sources_movement_trace
            AFTER UPDATE OF available_quantity ON water_sources
            DEFERRABLE INITIALLY DEFERRED
            FOR EACH ROW EXECUTE FUNCTION agriwater_assert_movement_trace();

        CREATE CONSTRAINT TRIGGER trg_water_sources_critical_alert
            AFTER UPDATE OF available_quantity ON water_sources
            DEFERRABLE INITIALLY DEFERRED
            FOR EACH ROW EXECUTE FUNCTION agriwater_alert_critical_water();

        CREATE TRIGGER trg_irrigations_closed_campaign_check
            BEFORE INSERT ON irrigations
            FOR EACH ROW EXECUTE FUNCTION agriwater_check_campaign_not_closed();

        CREATE TRIGGER trg_expenses_closed_campaign_check
            BEFORE INSERT ON expenses
            FOR EACH ROW EXECUTE FUNCTION agriwater_check_campaign_not_closed();

        CREATE TRIGGER trg_activities_closed_campaign_check
            BEFORE INSERT ON activities
            FOR EACH ROW WHEN (NEW.campaign_id IS NOT NULL)
            EXECUTE FUNCTION agriwater_check_campaign_not_closed();

        CREATE TRIGGER trg_revenues_harvest_check
            BEFORE INSERT OR UPDATE OF quantity, harvest_id ON revenues
            FOR EACH ROW EXECUTE FUNCTION agriwater_check_revenue_vs_harvest();

        CREATE TRIGGER trg_water_movements_farm_check
            BEFORE INSERT OR UPDATE ON water_movements
            FOR EACH ROW WHEN (NEW.campaign_id IS NOT NULL)
            EXECUTE FUNCTION agriwater_check_same_farm('campaigns', 'campaign_id');

        CREATE TRIGGER trg_stock_movements_farm_check
            BEFORE INSERT OR UPDATE ON stock_movements
            FOR EACH ROW WHEN (NEW.campaign_id IS NOT NULL)
            EXECUTE FUNCTION agriwater_check_same_farm('campaigns', 'campaign_id');

        CREATE TRIGGER trg_activities_farm_check
            BEFORE INSERT OR UPDATE ON activities
            FOR EACH ROW WHEN (NEW.campaign_id IS NOT NULL)
            EXECUTE FUNCTION agriwater_check_same_farm('campaigns', 'campaign_id');

        CREATE TRIGGER trg_expenses_farm_check
            BEFORE INSERT OR UPDATE ON expenses
            FOR EACH ROW WHEN (NEW.campaign_id IS NOT NULL)
            EXECUTE FUNCTION agriwater_check_same_farm('campaigns', 'campaign_id');

        CREATE TRIGGER trg_revenues_farm_check
            BEFORE INSERT OR UPDATE ON revenues
            FOR EACH ROW WHEN (NEW.campaign_id IS NOT NULL)
            EXECUTE FUNCTION agriwater_check_same_farm('campaigns', 'campaign_id');

        CREATE TRIGGER trg_alerts_farm_check
            BEFORE INSERT OR UPDATE ON alerts
            FOR EACH ROW WHEN (NEW.campaign_id IS NOT NULL)
            EXECUTE FUNCTION agriwater_check_same_farm('campaigns', 'campaign_id');

        CREATE TRIGGER trg_irrigation_schedules_farm_check
            BEFORE INSERT OR UPDATE ON irrigation_schedules
            FOR EACH ROW WHEN (NEW.campaign_id IS NOT NULL)
            EXECUTE FUNCTION agriwater_check_same_farm('campaigns', 'campaign_id');

        CREATE TRIGGER trg_irrigations_log
            AFTER INSERT OR UPDATE OF status ON irrigations
            FOR EACH ROW EXECUTE FUNCTION agriwater_log_operation();

        CREATE TRIGGER trg_water_sources_log
            AFTER INSERT OR UPDATE ON water_sources
            FOR EACH ROW EXECUTE FUNCTION agriwater_log_operation();

        CREATE OR REPLACE VIEW v_farm_dashboard AS
        SELECT
            f.id                                                   AS farm_id,
            f.name                                                 AS farm_name,
            f.status                                               AS farm_status,
            (SELECT count(*) FROM campaigns c
              WHERE c.farm_id = f.id AND c.status = 'active')      AS active_campaigns,
            (SELECT count(*) FROM campaigns c WHERE c.farm_id = f.id) AS total_campaigns,
            (SELECT count(*) FROM plots p WHERE p.farm_id = f.id)  AS plot_count,
            (SELECT COALESCE(sum(agriwater_to_m2(p.area, p.area_unit)), 0)
               FROM plots p WHERE p.farm_id = f.id)                AS total_area_m2,
            (SELECT COALESCE(sum(ws.available_quantity), 0)
               FROM water_sources ws
              WHERE ws.farm_id = f.id AND ws.status = 'active')    AS water_available,
            (SELECT COALESCE(sum(ws.capacity), 0)
               FROM water_sources ws
              WHERE ws.farm_id = f.id AND ws.status = 'active')    AS water_capacity,
            (SELECT count(*) FROM water_sources ws
              WHERE ws.farm_id = f.id AND ws.status = 'active'
                AND ws.available_quantity <= ws.critical_threshold) AS critical_water_sources,
            (SELECT count(*) FROM irrigations i
              WHERE i.farm_id = f.id AND i.status = 'realisee'
                AND i.performed_at >= date_trunc('month', now()))  AS irrigations_this_month,
            (SELECT COALESCE(sum(e.amount), 0) FROM expenses e
              WHERE e.farm_id = f.id
                AND e.expense_date >= date_trunc('month', now())::date) AS expenses_this_month,
            (SELECT COALESCE(sum(r.amount), 0) FROM revenues r
              WHERE r.farm_id = f.id
                AND r.revenue_date >= date_trunc('month', now())::date) AS revenues_this_month,
            (SELECT COALESCE(sum(r.amount), 0) FROM revenues  r WHERE r.farm_id = f.id)
          - (SELECT COALESCE(sum(e.amount), 0) FROM expenses e WHERE e.farm_id = f.id) AS marge_farm,
            (SELECT count(*) FROM alerts a
              WHERE a.farm_id = f.id AND a.is_read = false)         AS unread_alerts,
            (SELECT count(*) FROM campaigns c
              WHERE c.farm_id = f.id AND c.status = 'active'
                AND c.expected_end_date < CURRENT_DATE)             AS overdue_campaigns,
            (SELECT max(a.created_at) FROM activities a WHERE a.farm_id = f.id) AS last_activity_at
        FROM farms f;

        CREATE OR REPLACE VIEW v_water_consumption_by_campaign AS
        SELECT
            c.id                        AS campaign_id,
            c.farm_id,
            c.code                      AS campaign_code,
            c.name                      AS campaign_name,
            cr.name                     AS crop_name,
            p.code                      AS plot_code,
            COALESCE(sum(i.quantity) FILTER (WHERE i.status IN ('validee','realisee')), 0) AS water_consumed,
            count(*) FILTER (WHERE i.status IN ('validee','realisee'))                   AS irrigation_count,
            max(i.performed_at) FILTER (WHERE i.status IN ('validee','realisee'))         AS last_irrigation_at
        FROM campaigns c
        JOIN plots     p  ON p.id  = c.plot_id
        JOIN crops     cr ON cr.id = c.crop_id
        LEFT JOIN irrigations i ON i.campaign_id = c.id
        GROUP BY c.id, c.farm_id, c.code, c.name, cr.name, p.code;

        CREATE OR REPLACE VIEW v_water_consumption_by_plot AS
        SELECT
            p.id                                                      AS plot_id,
            p.farm_id,
            p.code                                                    AS plot_code,
            p.name                                                    AS plot_name,
            agriwater_to_m2(p.area, p.area_unit)                      AS area_m2,
            COALESCE(sum(i.quantity) FILTER (WHERE i.status IN ('validee','realisee')), 0)
                                                                      AS water_consumed,
            round(
                COALESCE(sum(i.quantity) FILTER (WHERE i.status IN ('validee','realisee')), 0)
                / NULLIF(agriwater_to_m2(p.area, p.area_unit), 0), 2) AS consumption_l_per_m2
        FROM plots p
        LEFT JOIN irrigations i ON i.plot_id = p.id
        GROUP BY p.id, p.farm_id, p.code, p.name, p.area, p.area_unit;

        CREATE OR REPLACE VIEW v_reserve_autonomy AS
        SELECT
            ws.id                                                       AS water_source_id,
            ws.farm_id,
            ws.name                                                     AS water_source_name,
            ws.unit,
            ws.available_quantity,
            ws.capacity,
            ws.critical_threshold,
            GREATEST(ws.available_quantity - ws.critical_threshold, 0)  AS usable_quantity,
            COALESCE(avg_daily.daily_consumption, 0)                    AS avg_daily_consumption,
            CASE WHEN COALESCE(avg_daily.daily_consumption, 0) > 0
                 THEN round((ws.available_quantity - ws.critical_threshold)
                            / avg_daily.daily_consumption, 1)
            END                                                         AS estimated_autonomy_days
        FROM water_sources ws
        LEFT JOIN (
            SELECT water_source_id,
                   COALESCE(sum(quantity), 0) / GREATEST(count(*) * 1.0, 1) AS daily_consumption
            FROM (
                SELECT water_source_id, quantity, performed_at::date AS d
                FROM irrigations
                WHERE status IN ('validee', 'realisee')
                  AND performed_at >= now() - interval '30 days'
            ) x
            GROUP BY water_source_id
        ) avg_daily ON avg_daily.water_source_id = ws.id
        WHERE ws.status = 'active';

        CREATE OR REPLACE VIEW v_irrigation_realization_rate AS
        SELECT
            s.farm_id,
            s.campaign_id,
            c.code                                    AS campaign_code,
            s.plot_id,
            count(*)                                  AS planned_count,
            count(*) FILTER (WHERE s.status = 'realisee') AS realized_count,
            round(100.0 * count(*) FILTER (WHERE s.status = 'realisee') / NULLIF(count(*), 0), 2)
                                                      AS realization_rate_pct
        FROM irrigation_schedules s
        JOIN campaigns c ON c.id = s.campaign_id
        GROUP BY s.farm_id, s.campaign_id, c.code, s.plot_id;

        CREATE OR REPLACE VIEW v_irrigation_priority AS
        SELECT
            p.id                AS plot_id,
            p.farm_id,
            p.code              AS plot_code,
            p.name              AS plot_name,
            p.status            AS plot_status,
            p.manual_priority,
            p.soil_moisture,
            cr.id               AS crop_id,
            cr.name             AS crop_name,
            cr.water_requirement,
            last_irr.last_irrigation_at,
            last_irr.days_since_last_irrigation,
            round(
                last_irr.days_since_last_irrigation * 4
                + cr.water_requirement
                + agriwater_priority_weight(p.manual_priority)
                + CASE WHEN p.soil_moisture IS NULL THEN 0
                       ELSE GREATEST(0, 30 - p.soil_moisture) END
            , 2)                AS priority_score,
            CASE
                WHEN last_irr.days_since_last_irrigation * 4
                     + cr.water_requirement
                     + agriwater_priority_weight(p.manual_priority)
                     + CASE WHEN p.soil_moisture IS NULL THEN 0
                            ELSE GREATEST(0, 30 - p.soil_moisture) END >= 60 THEN 'critique'
                WHEN last_irr.days_since_last_irrigation * 4
                     + cr.water_requirement
                     + agriwater_priority_weight(p.manual_priority)
                     + CASE WHEN p.soil_moisture IS NULL THEN 0
                            ELSE GREATEST(0, 30 - p.soil_moisture) END >= 40 THEN 'elevee'
                WHEN last_irr.days_since_last_irrigation * 4
                     + cr.water_requirement
                     + agriwater_priority_weight(p.manual_priority)
                     + CASE WHEN p.soil_moisture IS NULL THEN 0
                            ELSE GREATEST(0, 30 - p.soil_moisture) END >= 20 THEN 'normale'
                ELSE 'faible'
            END                 AS proposed_priority
        FROM plots p
        JOIN campaigns c  ON c.plot_id = p.id AND c.farm_id = p.farm_id AND c.status = 'active'
        JOIN crops     cr ON cr.id = c.crop_id
        CROSS JOIN LATERAL (
            SELECT
                max(i.performed_at) FILTER (WHERE i.status IN ('validee','realisee')) AS last_irrigation_at,
                COALESCE(
                    (CURRENT_DATE - COALESCE(
                        max(i.performed_at) FILTER (WHERE i.status IN ('validee','realisee')),
                        p.created_at
                    )::date),
                    0) AS days_since_last_irrigation
            FROM irrigations i
            WHERE i.plot_id = p.id AND i.farm_id = p.farm_id
        ) last_irr;

        CREATE OR REPLACE VIEW v_irrigation_full AS
        SELECT
            i.id,
            i.farm_id,
            f.name                                   AS farm_name,
            c.code                                   AS campaign_code,
            c.name                                   AS campaign_name,
            p.code                                   AS plot_code,
            p.name                                   AS plot_name,
            cr.name                                  AS crop_name,
            i.water_source_id,
            ws.name                                  AS water_source_name,
            ws.type                                  AS water_source_type,
            i.unit,
            i.quantity,
            i.duration_minutes,
            i.method,
            i.status,
            i.scheduled_at,
            i.performed_at,
            i.performed_by,
            per.name                                 AS performed_by_name,
            i.validated_by,
            val.name                                 AS validated_by_name,
            i.observation,
            wm.id                                    AS water_movement_id,
            wm.type                                  AS water_movement_type,
            wm.quantity_after                        AS water_level_after
        FROM irrigations i
        JOIN farms         f   ON f.id  = i.farm_id
        JOIN campaigns     c   ON c.id  = i.campaign_id
        JOIN plots         p   ON p.id  = i.plot_id
        JOIN crops         cr  ON cr.id = c.crop_id
        JOIN water_sources ws  ON ws.id = i.water_source_id
        JOIN users         per ON per.id = i.performed_by
        LEFT JOIN users    val ON val.id = i.validated_by
        LEFT JOIN water_movements wm ON wm.irrigation_id = i.id;
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        DROP VIEW IF EXISTS v_irrigation_full CASCADE;
        DROP VIEW IF EXISTS v_irrigation_priority CASCADE;
        DROP VIEW IF EXISTS v_irrigation_realization_rate CASCADE;
        DROP VIEW IF EXISTS v_reserve_autonomy CASCADE;
        DROP VIEW IF EXISTS v_water_consumption_by_plot CASCADE;
        DROP VIEW IF EXISTS v_water_consumption_by_campaign CASCADE;
        DROP VIEW IF EXISTS v_farm_dashboard CASCADE;
        DROP TRIGGER IF EXISTS trg_farms_manager_check ON farms;
        DROP TRIGGER IF EXISTS trg_campaigns_plot_check ON campaigns;
        DROP TRIGGER IF EXISTS trg_irrigations_coherence_check ON irrigations;
        DROP TRIGGER IF EXISTS trg_irrigations_manager_validation_check ON irrigations;
        DROP TRIGGER IF EXISTS trg_irrigations_closed_campaign_check ON irrigations;
        DROP TRIGGER IF EXISTS trg_expenses_closed_campaign_check ON expenses;
        DROP TRIGGER IF EXISTS trg_activities_closed_campaign_check ON activities;
        DROP TRIGGER IF EXISTS trg_revenues_harvest_check ON revenues;
        DROP TRIGGER IF EXISTS trg_water_movements_farm_check ON water_movements;
        DROP TRIGGER IF EXISTS trg_stock_movements_farm_check ON stock_movements;
        DROP TRIGGER IF EXISTS trg_activities_farm_check ON activities;
        DROP TRIGGER IF EXISTS trg_expenses_farm_check ON expenses;
        DROP TRIGGER IF EXISTS trg_revenues_farm_check ON revenues;
        DROP TRIGGER IF EXISTS trg_alerts_farm_check ON alerts;
        DROP TRIGGER IF EXISTS trg_irrigation_schedules_farm_check ON irrigation_schedules;
        DROP TRIGGER IF EXISTS trg_irrigations_log ON irrigations;
        DROP TRIGGER IF EXISTS trg_water_sources_log ON water_sources;
        DROP FUNCTION IF EXISTS agriwater_set_updated_at() CASCADE;
        DROP FUNCTION IF EXISTS agriwater_to_m2(numeric, area_unit) CASCADE;
        DROP FUNCTION IF EXISTS agriwater_manager_validation_threshold() CASCADE;
        DROP FUNCTION IF EXISTS agriwater_priority_weight(priority_level) CASCADE;
        DROP FUNCTION IF EXISTS agriwater_check_farm_manager() CASCADE;
        DROP FUNCTION IF EXISTS agriwater_check_campaign_plot() CASCADE;
        DROP FUNCTION IF EXISTS agriwater_check_irrigation_coherence() CASCADE;
        DROP FUNCTION IF EXISTS agriwater_check_manager_validation() CASCADE;
        DROP FUNCTION IF EXISTS agriwater_assert_movement_trace() CASCADE;
        DROP FUNCTION IF EXISTS agriwater_alert_critical_water() CASCADE;
        DROP FUNCTION IF EXISTS agriwater_check_campaign_not_closed() CASCADE;
        DROP FUNCTION IF EXISTS agriwater_check_revenue_vs_harvest() CASCADE;
        DROP FUNCTION IF EXISTS agriwater_check_same_farm() CASCADE;
        DROP FUNCTION IF EXISTS agriwater_log_operation() CASCADE;
        SQL);
    }
};
