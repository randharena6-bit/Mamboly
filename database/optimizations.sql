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
--
--  Contenu :
--    1. Extensions (recherche floue pg_trgm)
--    2. Index manquants sur les clés étrangères et colonnes de filtre
--    3. Index composites « couvrants » (INCLUDE) pour les requêtes chaudes
--    4. Index BRIN pour les colonnes temporelles (séries)
--    5. Index GIN (jsonb) et GIN trigram (recherche texte)
--    6. Statistiques étendues (corrélations inter-colonnes)
--    7. Réglages de stockage : fillfactor + autovacuum ciblés
--    8. Vues matérialisées analytiques + fonction de rafraîchissement
--    9. ANALYZE final (recalcul du planificateur)
-- =============================================================================

-- =============================================================================
--  1. EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- recherche floue (recherche texte)


-- =============================================================================
--  2. INDEX MANQUANTS SUR LES CLÉS ÉTRANGÈRES ET COLONNES DE FILTRE
--     (les FK ne sont pas indexées automatiquement par PostgreSQL)
-- =============================================================================

-- Activités
CREATE INDEX IF NOT EXISTS activities_user_id_index        ON activities (user_id);
CREATE INDEX IF NOT EXISTS activities_farm_type_date_index ON activities (farm_id, type, activity_date DESC);

-- Mouvements de stock
CREATE INDEX IF NOT EXISTS stock_movements_farm_id_index   ON stock_movements (farm_id);
CREATE INDEX IF NOT EXISTS stock_movements_user_id_index   ON stock_movements (user_id);
CREATE INDEX IF NOT EXISTS stock_movements_campaign_index  ON stock_movements (campaign_id);
CREATE INDEX IF NOT EXISTS stock_movements_type_index      ON stock_movements (type);

-- Mouvements d'eau
CREATE INDEX IF NOT EXISTS water_movements_farm_id_index   ON water_movements (farm_id);
CREATE INDEX IF NOT EXISTS water_movements_user_id_index   ON water_movements (user_id);

-- Planification
CREATE INDEX IF NOT EXISTS irrigation_schedules_water_source_index ON irrigation_schedules (water_source_id);
CREATE INDEX IF NOT EXISTS irrigation_schedules_plot_index         ON irrigation_schedules (plot_id);
CREATE INDEX IF NOT EXISTS irrigation_schedules_campaign_index     ON irrigation_schedules (campaign_id);
CREATE INDEX IF NOT EXISTS irrigation_schedules_farm_status_index  ON irrigation_schedules (farm_id, status);

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

-- Journal d'audit
CREATE INDEX IF NOT EXISTS activity_logs_action_index      ON activity_logs (action);
CREATE INDEX IF NOT EXISTS activity_logs_entity_id_index   ON activity_logs (entity_id);


-- =============================================================================
--  3. INDEX COMPOSITES « COUVRANTS » (INCLUDE) POUR LES REQUÊTES CHAUDES
-- =============================================================================

-- Consommation d'eau par campagne : filtre (campaign_id) + agrégat (quantity) + statut
CREATE INDEX IF NOT EXISTS irrigations_campaign_cover_index
    ON irrigations (campaign_id, status) INCLUDE (quantity);

-- Autonomie des réserves : filtre (water_source_id, status, performed_at)
CREATE INDEX IF NOT EXISTS irrigations_source_perf_index
    ON irrigations (water_source_id, status, performed_at DESC) INCLUDE (quantity);

-- Parcelle -> irrigations (score de priorité § 6.10)
CREATE INDEX IF NOT EXISTS irrigations_plot_perf_index
    ON irrigations (plot_id, status) INCLUDE (performed_at, quantity);

-- Marge par exploitation : recettes / dépenses triées
CREATE INDEX IF NOT EXISTS expenses_farm_date_cover_index
    ON expenses (farm_id, expense_date DESC) INCLUDE (amount);
CREATE INDEX IF NOT EXISTS revenues_farm_date_cover_index
    ON revenues (farm_id, revenue_date DESC) INCLUDE (amount);

-- Journal d'eau d'une ressource dans l'ordre chronologique
CREATE INDEX IF NOT EXISTS water_movements_source_date_cover_index
    ON water_movements (water_source_id, movement_date DESC) INCLUDE (quantity, type);


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


-- =============================================================================
--  5. INDEX GIN — JSONB ET RECHERCHE TEXTE (trigrammes)
-- =============================================================================
CREATE INDEX IF NOT EXISTS roles_permissions_gin_index ON roles USING gin (permissions);

CREATE INDEX IF NOT EXISTS users_name_trgm_index         ON users         USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS users_email_trgm_index        ON users         USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS plots_name_trgm_index         ON plots         USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS campaigns_name_trgm_index     ON campaigns     USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS water_sources_name_trgm_index ON water_sources USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS inputs_name_trgm_index        ON inputs        USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS crops_name_trgm_index         ON crops         USING gin (name gin_trgm_ops);


-- =============================================================================
--  6. STATISTIQUES ÉTENDUES (corrélations inter-colonnes)
--     Aident le planificateur sur les prédicats combinés.
-- =============================================================================
CREATE STATISTICS IF NOT EXISTS campaigns_farm_status_stats     (dependencies, ndistinct) ON farm_id, status     FROM campaigns;
CREATE STATISTICS IF NOT EXISTS water_sources_farm_status_stats (dependencies, ndistinct) ON farm_id, status     FROM water_sources;
CREATE STATISTICS IF NOT EXISTS irrigations_farm_status_stats   (dependencies, ndistinct) ON farm_id, status     FROM irrigations;
CREATE STATISTICS IF NOT EXISTS plots_farm_status_stats         (dependencies, ndistinct) ON farm_id, status     FROM plots;
CREATE STATISTICS IF NOT EXISTS alerts_farm_read_stats          (dependencies)           ON farm_id, is_read    FROM alerts;


-- =============================================================================
--  7. RÉGLAGES DE STOCKAGE : FILLFACTOR + AUTOVACUUM CIBLÉS
-- =============================================================================

-- Tables à forte mise à jour en place : on réserve de l'espace (HOT updates).
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
ALTER TABLE plots SET (fillfactor = 90);
ALTER TABLE users SET (fillfactor = 90);

-- Tables append-only : pages pleines, analyse fréquente, vacuum rare.
ALTER TABLE irrigations SET (
    fillfactor = 100,
    autovacuum_analyze_scale_factor = 0.02
);
ALTER TABLE water_movements SET (
    fillfactor = 100,
    autovacuum_analyze_scale_factor = 0.02
);
ALTER TABLE stock_movements SET (
    fillfactor = 100,
    autovacuum_analyze_scale_factor = 0.02
);
ALTER TABLE activity_logs SET (
    fillfactor = 100,
    autovacuum_analyze_scale_factor = 0.02
);


-- =============================================================================
--  8. VUES MATÉRIALISÉES ANALYTIQUES + RAFRAÎCHISSEMENT
-- =============================================================================

-- Consommation d'eau agrégée par jour / exploitation / campagne / parcelle.
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
WITH DATA;

-- Index unique requis pour REFRESH MATERIALIZED VIEW CONCURRENTLY.
CREATE UNIQUE INDEX IF NOT EXISTS mv_water_consumption_daily_key
    ON mv_water_consumption_daily (farm_id, campaign_id, plot_id, water_source_id, day);

CREATE INDEX IF NOT EXISTS mv_water_consumption_daily_farm_day_index
    ON mv_water_consumption_daily (farm_id, day DESC);

-- Rafraîchit les vues matérialisées sans bloquer les lectures.
CREATE OR REPLACE FUNCTION agriwater_refresh_analytics() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_water_consumption_daily;
END;
$$;

COMMENT ON MATERIALIZED VIEW mv_water_consumption_daily IS
    'Agrégat quotidien de consommation d''eau (analytique). Rafraîchir via agriwater_refresh_analytics().';


-- =============================================================================
--  9. RECALCUL DES STATISTIQUES DU PLANIFICATEUR
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
