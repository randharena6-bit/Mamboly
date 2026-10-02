-- =============================================================================
--  AgriWater — Pack d'optimisation PostgreSQL « gold »
--
--  Objectif : maximiser les performances de lecture (tableau de bord, API,
--  rapports) et la robustesse des écritures (irrigations, mouvements d'eau),
--  sans changer le modèle logique.
--
--  Idempotent : peut être ré-appliqué sans erreur.
--  Application :
--    psql -U agriwater -d agriwater -v ON_ERROR_STOP=1 -f database/optimizations.sql
--  Prérequis   : database/schema.sql puis database/seed/agriwater_demo.sql
--
--  Contenu :
--    1. Extensions (recherche floue pg_trgm)
--    2. Index sur clés étrangères et colonnes de filtre
--    3. Index composites « couvrants » (INCLUDE) pour les requêtes chaudes
--    4. Index BRIN pour les colonnes temporelles (séries)
--    5. Index GIN (jsonb) et GIN trigram (recherche texte)
--    6. Statistiques étendues + statistiques fines sur colonnes penurées
--    7. Réglages de stockage (fillfactor, autovacuum) y compris sur les
--       feuilles de partition — chose impossible sur la table partitionnée
--    8. Vues matérialisées analytiques + fonction de rafraîchissement
--    9. Maintenance courante : partitions, vues matérialisées, statistiques
--
--  Les index déclarés sur une table partitionnée sont automatiquement
--  recréés sur chaque partition rattachée ultérieurement : rien à maintenir
--  à la main.
-- =============================================================================

SET search_path TO agriwater, public;

-- =============================================================================
--  1. EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- recherche floue (recherche texte)


-- =============================================================================
--  2. INDEX MANQUANTS SUR LES CLÉS ÉTRANGÈRES ET COLONNES DE FILTRE
--     (les FK ne sont pas indexées automatiquement par PostgreSQL)
-- =============================================================================

-- Activités (partitionnée : index propagé à chaque partition)
CREATE INDEX IF NOT EXISTS activities_user_id_index          ON activities (user_id);
CREATE INDEX IF NOT EXISTS activities_farm_type_date_index   ON activities (farm_id, type, activity_date DESC);
CREATE INDEX IF NOT EXISTS activities_plot_date_index        ON activities (plot_id, activity_date DESC);

-- Mouvements de stock
CREATE INDEX IF NOT EXISTS stock_movements_farm_id_index   ON stock_movements (farm_id);
CREATE INDEX IF NOT EXISTS stock_movements_user_id_index   ON stock_movements (user_id);
CREATE INDEX IF NOT EXISTS stock_movements_campaign_index  ON stock_movements (campaign_id);
CREATE INDEX IF NOT EXISTS stock_movements_type_index      ON stock_movements (type);

-- Mouvements d'eau (partitionnée)
CREATE INDEX IF NOT EXISTS water_movements_farm_id_index   ON water_movements (farm_id);
CREATE INDEX IF NOT EXISTS water_movements_user_id_index   ON water_movements (user_id);

-- Planification
CREATE INDEX IF NOT EXISTS irrigation_schedules_water_source_index ON irrigation_schedules (water_source_id);
CREATE INDEX IF NOT EXISTS irrigation_schedules_plot_index         ON irrigation_schedules (plot_id);
CREATE INDEX IF NOT EXISTS irrigation_schedules_campaign_index     ON irrigation_schedules (campaign_id);
CREATE INDEX IF NOT EXISTS irrigation_schedules_farm_status_index  ON irrigation_schedules (farm_id, status);
CREATE INDEX IF NOT EXISTS irrigation_schedules_agent_status_index ON irrigation_schedules (agent_id, status);

-- Récoltes
CREATE INDEX IF NOT EXISTS harvests_farm_date_index        ON harvests (farm_id, harvest_date DESC);
CREATE INDEX IF NOT EXISTS harvests_user_id_index          ON harvests (user_id);

-- Dépenses / recettes
CREATE INDEX IF NOT EXISTS expenses_user_id_index          ON expenses (user_id);
CREATE INDEX IF NOT EXISTS revenues_user_id_index          ON revenues (user_id);

-- Intrants
CREATE INDEX IF NOT EXISTS inputs_farm_status_index        ON inputs (farm_id, status);
CREATE INDEX IF NOT EXISTS inputs_category_index           ON inputs (category);
CREATE INDEX IF NOT EXISTS inputs_low_stock_index          ON inputs (farm_id)
    WHERE available_quantity <= minimum_threshold;

-- Alertes
CREATE INDEX IF NOT EXISTS alerts_input_index              ON alerts (input_id)
    WHERE input_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS alerts_campaign_index           ON alerts (campaign_id)
    WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS alerts_type_index               ON alerts (type);

-- Journal d'audit (partitionné)
CREATE INDEX IF NOT EXISTS activity_logs_action_index      ON activity_logs (action);
CREATE INDEX IF NOT EXISTS activity_logs_entity_id_index   ON activity_logs (entity_id);


-- =============================================================================
--  3. INDEX COMPOSITES « COUVRANTS » (INCLUDE) POUR LES REQUÊTES CHAUDES
--
--     Un index couvrant permet un « Index Only Scan » : PostgreSQL n'a plus
--     besoin de lire la table elle-même. C'est le gain le plus visible sur les
--     agrégats du tableau de bord, qui interrogent des millions de lignes.
-- =============================================================================

-- Consommation d'eau par campagne : filtre (campaign_id) + agrégat (quantity) + statut
CREATE INDEX IF NOT EXISTS irrigations_campaign_cover_index
    ON irrigations (campaign_id, status) INCLUDE (quantity);

-- Autonomie des réserves : filtre (water_source_id, status, performed_at)
CREATE INDEX IF NOT EXISTS irrigations_source_perf_index
    ON irrigations (water_source_id, status, performed_at DESC) INCLUDE (quantity);

-- Score de priorité § 6.10 : parcelle -> dernières irrigations
CREATE INDEX IF NOT EXISTS irrigations_plot_perf_index
    ON irrigations (plot_id, status) INCLUDE (performed_at, quantity);

-- Tableau de bord : compteur d'irrigations du mois par exploitation
CREATE INDEX IF NOT EXISTS irrigations_farm_perf_cover_index
    ON irrigations (farm_id, status, performed_at DESC) INCLUDE (quantity, plot_id);

-- Marge par exploitation : recettes / dépenses triées
CREATE INDEX IF NOT EXISTS expenses_farm_date_cover_index
    ON expenses (farm_id, expense_date DESC) INCLUDE (amount);
CREATE INDEX IF NOT EXISTS revenues_farm_date_cover_index
    ON revenues (farm_id, revenue_date DESC) INCLUDE (amount);

-- Coûts des activités imputés à une campagne
CREATE INDEX IF NOT EXISTS activities_campaign_cover_index
    ON activities (campaign_id) INCLUDE (cost, activity_date);

-- Journal d'eau d'une ressource dans l'ordre chronologique
CREATE INDEX IF NOT EXISTS water_movements_source_date_cover_index
    ON water_movements (water_source_id, movement_date DESC) INCLUDE (quantity, type);

-- Planning du jour : quoi faire, où, avec quelle ressource
CREATE INDEX IF NOT EXISTS irrigation_schedules_planning_index
    ON irrigation_schedules (scheduled_date, status, farm_id)
    INCLUDE (plot_id, water_source_id, agent_id, estimated_quantity, priority);

-- Journal d'audit : historique d'un utilisateur
CREATE INDEX IF NOT EXISTS activity_logs_user_recent_index
    ON activity_logs (user_id, created_at DESC) INCLUDE (action, entity_type, entity_id);


-- =============================================================================
--  4. INDEX BRIN — COLONNES TEMPORELLES (séries, très compacts)
--     Adaptés aux tables append-only : coût d'écriture quasi nul.
-- =============================================================================

CREATE INDEX IF NOT EXISTS activity_logs_created_brin  ON activity_logs  USING brin (created_at);
CREATE INDEX IF NOT EXISTS water_movements_date_brin   ON water_movements USING brin (movement_date);
CREATE INDEX IF NOT EXISTS irrigations_performed_brin  ON irrigations    USING brin (performed_at);
CREATE INDEX IF NOT EXISTS stock_movements_date_brin   ON stock_movements USING brin (movement_date);
CREATE INDEX IF NOT EXISTS expenses_date_brin          ON expenses        USING brin (expense_date);
CREATE INDEX IF NOT EXISTS revenues_date_brin          ON revenues        USING brin (revenue_date);
CREATE INDEX IF NOT EXISTS alerts_created_brin         ON alerts          USING brin (created_at);
CREATE INDEX IF NOT EXISTS activities_date_brin        ON activities      USING brin (activity_date);


-- =============================================================================
--  5. INDEX GIN — JSONB ET RECHERCHE TEXTE (trigrammes)
-- =============================================================================

CREATE INDEX IF NOT EXISTS roles_permissions_gin_index ON roles USING gin (permissions);

CREATE INDEX IF NOT EXISTS users_name_trgm_index         ON users         USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS users_email_trgm_index        ON users         USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS plots_name_trgm_index         ON plots         USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS plots_code_trgm_index         ON plots         USING gin (code gin_trgm_ops);
CREATE INDEX IF NOT EXISTS campaigns_name_trgm_index     ON campaigns     USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS campaigns_code_trgm_index     ON campaigns     USING gin (code gin_trgm_ops);
CREATE INDEX IF NOT EXISTS water_sources_name_trgm_index ON water_sources USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS inputs_name_trgm_index        ON inputs        USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS crops_name_trgm_index         ON crops         USING gin (name gin_trgm_ops);


-- =============================================================================
--  6. STATISTIQUES ÉTENDUES ET STATISTIQUES FINES
--
--     CREATE STATISTICS corrige l'estimation du planificateur sur les
--     prédicats combinés. SET STATISTICS N force un histogramme à N pouilles
--     sur une colonne à distribution très irrégulière (valeurs rares).
-- =============================================================================

CREATE STATISTICS IF NOT EXISTS campaigns_farm_status_stats   (dependencies, ndistinct) ON farm_id, status      FROM campaigns;
CREATE STATISTICS IF NOT EXISTS water_sources_farm_status_stats (dependencies, ndistinct) ON farm_id, status      FROM water_sources;
CREATE STATISTICS IF NOT EXISTS irrigations_farm_status_stats (dependencies, ndistinct) ON farm_id, status      FROM irrigations;
CREATE STATISTICS IF NOT EXISTS plots_farm_status_stats       (dependencies, ndistinct) ON farm_id, status      FROM plots;
CREATE STATISTICS IF NOT EXISTS alerts_farm_read_stats        (dependencies)           ON farm_id, is_read     FROM alerts;
CREATE STATISTICS IF NOT EXISTS irrigations_campaign_status_stats
    (dependencies, mcv) ON campaign_id, status, method FROM irrigations;
CREATE STATISTICS IF NOT EXISTS activities_farm_type_stats
    (dependencies, mcv)  ON farm_id, type FROM activities;
CREATE STATISTICS IF NOT EXISTS water_movements_source_type_stats
    (dependencies, mcv)  ON water_source_id, type FROM water_movements;

-- Colonnes à distribution irrégulière : un échantillon plus fin améliore
-- nettement le choix entre index scan et parcours séquentiel.
ALTER TABLE water_sources   ALTER COLUMN status               SET STATISTICS 500;
ALTER TABLE water_sources   ALTER COLUMN available_quantity    SET STATISTICS 500;
ALTER TABLE plots           ALTER COLUMN manual_priority       SET STATISTICS 200;
ALTER TABLE plots           ALTER COLUMN status               SET STATISTICS 200;
ALTER TABLE irrigations     ALTER COLUMN status               SET STATISTICS 500;
ALTER TABLE irrigations     ALTER COLUMN method               SET STATISTICS 200;
ALTER TABLE campaigns       ALTER COLUMN status               SET STATISTICS 300;
ALTER TABLE inputs          ALTER COLUMN status               SET STATISTICS 200;
ALTER TABLE alerts          ALTER COLUMN type                 SET STATISTICS 200;
ALTER TABLE alerts          ALTER COLUMN severity             SET STATISTICS 100;
ALTER TABLE crops           ALTER COLUMN category             SET STATISTICS 200;


-- =============================================================================
--  7. RÉGLAGES DE STOCKAGE : FILLFACTOR + AUTOVACUUM
--
--     ATTENTION : sur une table PARTITIONNÉE, PostgreSQL refuse les storage
--     parameters ; ils doivent être posés sur chaque feuille (partition).
--     Les tables directement modifiables le sont ici, et les feuilles le sont
--     par la fonction ci-dessous, également appelée par agriwater_maintenance
--     afin que les partitions créées ultérieurement en bénéficient.
-- =============================================================================

CREATE OR REPLACE FUNCTION agriwater_apply_partition_storage() RETURNS integer
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
DECLARE
    r   record;
    n   integer := 0;
BEGIN
    FOR r IN
        SELECT c.oid::regclass AS leaf
          FROM pg_inherits i
          JOIN pg_class c     ON c.oid = i.inhrelid
          JOIN pg_class p     ON p.oid = i.inhparent
          JOIN pg_namespace n ON n.oid = p.relnamespace
         WHERE n.nspname = 'agriwater'
           AND p.relname IN ('water_movements', 'activities', 'activity_logs')
           AND p.relkind = 'p'
           AND c.relkind = 'r'
    LOOP
        EXECUTE format('ALTER TABLE %s SET ('
                       '    fillfactor = 100,'
                       '    autovacuum_analyze_scale_factor = 0.02,'
                       '    autovacuum_vacuum_insert_scale_factor = 0.05)', r.leaf);
        n := n + 1;
    END LOOP;
    RETURN n;
END;
$$;

COMMENT ON FUNCTION agriwater_apply_partition_storage() IS
    'Applique fillfactor/autovacuum aux feuilles de partition (opération impossible sur la table partitionnée elle-même).';

-- Tables à forte mise à jour en place : on réserve de l'espace (HOT updates).
-- Plus de place dans une page = mise à jour performed « in place », donc pas
-- d'écriture de WAL d'index, ce qui divise les I/O des écritures concurrentes.
ALTER TABLE water_sources SET (
    fillfactor = 80,
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);
ALTER TABLE inputs SET (
    fillfactor = 85,
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.02
);
ALTER TABLE campaigns SET (fillfactor = 90);
ALTER TABLE plots     SET (fillfactor = 90);
ALTER TABLE users     SET (fillfactor = 90);

-- Tables append-only non partitionnées : pages pleines, analyse fréquente.
ALTER TABLE irrigations SET (
    fillfactor = 100,
    autovacuum_analyze_scale_factor = 0.02
);
ALTER TABLE stock_movements SET (
    fillfactor = 100,
    autovacuum_analyze_scale_factor = 0.02
);

SELECT agriwater_apply_partition_storage() AS partitions_tunables;


-- =============================================================================
--  8. VUES MATÉRIALISÉES ANALYTIQUES
--
--     Les vues du tableau de bord sont très coûteuses sur de gros volumes.
--     Onfige les agrégats les plus utilisés, indexés comme des tables, puis
--     rafraîchis sans bloquer les lectures (CONCURRENTLY).
-- =============================================================================

-- 8.1 Consommation d'eau agrégée par jour / exploitation / campagne / parcelle
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_water_consumption_daily AS
SELECT
    i.farm_id,
    i.campaign_id,
    i.plot_id,
    i.water_source_id,
    i.performed_at::date AS day,
    sum(i.quantity)      AS total_quantity,
    count(*)             AS irrigation_count
FROM irrigations i
WHERE i.status IN ('validee', 'realisee')
GROUP BY i.farm_id, i.campaign_id, i.plot_id, i.water_source_id, i.performed_at::date
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS mv_water_consumption_daily_key
    ON mv_water_consumption_daily (farm_id, campaign_id, plot_id, water_source_id, day);

CREATE INDEX IF NOT EXISTS mv_water_consumption_daily_farm_day_index
    ON mv_water_consumption_daily (farm_id, day DESC);

-- 8.2 Synthèse financière par campagne (marge, coût de l'eau, rendement)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_campaign_financials AS
SELECT
    c.id                        AS campaign_id,
    c.farm_id,
    c.plot_id,
    c.code                      AS campaign_code,
    c.name                      AS campaign_name,
    c.status,
    c.start_date,
    c.expected_end_date,
    COALESCE(e.total_expenses, 0)   AS total_expenses,
    COALESCE(a.total_activity_cost, 0) AS total_activity_cost,
    COALESCE(r.total_revenues, 0)  AS total_revenues,
    COALESCE(h.total_harvest, 0)   AS total_harvest,
    COALESCE(w.total_water, 0)     AS total_water,
    COALESCE(r.total_revenues, 0) - COALESCE(e.total_expenses, 0)
        - COALESCE(a.total_activity_cost, 0)            AS gross_margin,
    round(
        CASE WHEN COALESCE(r.total_revenues, 0) > 0
             THEN 100.0 * (COALESCE(r.total_revenues, 0)
                           - COALESCE(e.total_expenses, 0)
                           - COALESCE(a.total_activity_cost, 0))
                  / r.total_revenues
        END, 2)                                        AS margin_rate_pct,
    round(
        CASE WHEN COALESCE(h.total_harvest, 0) > 0
             THEN COALESCE(w.total_water, 0) / h.total_harvest
        END, 2)                                        AS water_l_per_kg
FROM campaigns c
LEFT JOIN (SELECT campaign_id, sum(amount) AS total_expenses FROM expenses GROUP BY 1) e
       ON e.campaign_id = c.id
LEFT JOIN (SELECT campaign_id, sum(COALESCE(cost, 0)) AS total_activity_cost FROM activities GROUP BY 1) a
       ON a.campaign_id = c.id
LEFT JOIN (SELECT campaign_id, sum(amount) AS total_revenues FROM revenues  GROUP BY 1) r
       ON r.campaign_id = c.id
LEFT JOIN (SELECT campaign_id, sum(quantity) AS total_harvest FROM harvests  GROUP BY 1) h
       ON h.campaign_id = c.id
LEFT JOIN (SELECT campaign_id, sum(quantity) AS total_water FROM irrigations
            WHERE status IN ('validee', 'realisee') GROUP BY 1) w
       ON w.campaign_id = c.id
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS mv_campaign_financials_key
    ON mv_campaign_financials (campaign_id);
CREATE INDEX IF NOT EXISTS mv_campaign_financials_farm_index
    ON mv_campaign_financials (farm_id, margin_rate_pct DESC NULLS LAST);

-- 8.3 État du stock d'intrants avec couverture estimée
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_input_stock AS
SELECT
    i.id                        AS input_id,
    i.farm_id,
    i.name,
    i.category,
    i.unit,
    i.available_quantity,
    i.minimum_threshold,
    i.unit_price,
    round(i.available_quantity * i.unit_price, 2)      AS stock_value,
    (i.available_quantity <= i.minimum_threshold)      AS is_critical,
    COALESCE(c.out_30d, 0)                             AS consumption_30d,
    round(CASE WHEN COALESCE(c.out_30d, 0) > 0
               THEN i.available_quantity / (c.out_30d / 30.0)
          END, 1)                                     AS days_of_coverage,
    (SELECT max(m.movement_date) FROM stock_movements m WHERE m.input_id = i.id)
                                                             AS last_movement_at
FROM inputs i
LEFT JOIN (
    SELECT input_id, sum(quantity) AS out_30d
      FROM stock_movements
     WHERE type IN ('sortie', 'consommation')
       AND movement_date >= now() - interval '30 days'
     GROUP BY input_id
) c ON c.input_id = i.id
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS mv_input_stock_key      ON mv_input_stock (input_id);
CREATE INDEX IF NOT EXISTS mv_input_stock_critical_index ON mv_input_stock (farm_id) WHERE is_critical;

COMMENT ON MATERIALIZED VIEW mv_water_consumption_daily IS
    'Agrégat quotidien de consommation d''eau (analytique).';
COMMENT ON MATERIALIZED VIEW mv_campaign_financials IS
    'Marge brute, taux de marge et consommation d''eau par kilogramme récolté, par campagne.';
COMMENT ON MATERIALIZED VIEW mv_input_stock IS
    'Valeur du stock d''intrants, criticité et couverture en jours.';

-- 8.4 Rafraîchissement sans blocage des lectures
CREATE OR REPLACE FUNCTION agriwater_refresh_analytics() RETURNS void
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
DECLARE
    v_sql text;
    t     text;
BEGIN
    FOREACH t IN ARRAY ARRAY['mv_water_consumption_daily', 'mv_campaign_financials', 'mv_input_stock'] LOOP
        -- Un rafraîchissement CONCURRENTLY exige un index UNIQUE déjà alimenté.
        IF NOT EXISTS (SELECT 1 FROM pg_class c
                        JOIN pg_namespace n ON n.oid = c.relnamespace
                       WHERE n.nspname = 'agriwater' AND c.relname = t AND c.relispopulated) THEN
            EXECUTE format('REFRESH MATERIALIZED VIEW agriwater.%I', t);
        ELSE
            EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY agriwater.%I', t);
        END IF;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION agriwater_refresh_analytics() IS
    'Rafraîchit les trois vues matérialisées analytiques, sans bloquer les lectures.';


-- =============================================================================
--  9. MAINTENANCE COURANTE
--
--    À exécuter par une tâche planifiée (cron / queue Laravel) :
--      SELECT agriwater_maintenance();
--
--    - crée les partitions des N prochains mois (obligatoire : au-delà de la
--      fenêtre, les écritures tombent dans la partition par défaut),
--    - réapplique les réglages de stockage aux nouvelles feuilles,
--    - rafraîchit les vues matérialisées,
--    - recalcule les statistiques du planificateur.
-- =============================================================================

CREATE OR REPLACE FUNCTION agriwater_maintenance(p_months_ahead integer DEFAULT 3) RETURNS void
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
DECLARE
    v_partitions integer;
    v_tuned     integer;
BEGIN
    v_partitions := agriwater_prepare_partitions(p_months_ahead);
    v_tuned     := agriwater_apply_partition_storage();
    PERFORM agriwater_refresh_analytics();
    EXECUTE format('ANALYZE %I', 'activity_logs');
    RAISE NOTICE 'Maintenance AgriWater : % partitions créées, % feuilles tunées, vues matérialisées rafraîchies',
                 v_partitions, v_tuned;
END;
$$;

COMMENT ON FUNCTION agriwater_maintenance(integer) IS
    'Maintenance planifiée : partitions, réglages de stockage, vues matérialisées, statistiques.';


-- =============================================================================
--  10. RECALCUL DES STATISTIQUES DU PLANIFICATEUR
-- =============================================================================
ANALYZE roles;
ANALYZE farms;
ANALYZE users;
ANALYZE crops;
ANALYZE plots;
ANALYZE campaigns;
ANALYZE water_sources;
ANALYZE irrigation_schedules;
ANALYZE irrigations;
ANALYZE water_movements;
ANALYZE activities;
ANALYZE inputs;
ANALYZE stock_movements;
ANALYZE harvests;
ANALYZE expenses;
ANALYZE revenues;
ANALYZE alerts;
ANALYZE activity_logs;

-- Remplissage initial des vues matérialisées (sans quoi elles resteraient vides)
SELECT agriwater_refresh_analytics();