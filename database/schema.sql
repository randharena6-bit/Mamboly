-- =============================================================================
--  AgriWater — Schéma PostgreSQL complet
--  Plateforme SaaS de gestion de l'irrigation, des ressources en eau
--  et des campagnes maraîchères.
--
--  Source      : CDC.md (cahier des charges) + MCD-UML.md (modèle conceptuel)
--  Réf. modèle : 19 entités, 40 associations, 13 règles métier (RM-01 à RM-13)
--  Compatible  : PostgreSQL 13+ (testé sur 16)
--
--  Contenu :
--    1. Types ENUM natifs
--    2. Tables métier (17) + tables techniques Laravel (5)
--    3. Contraintes d'intégrité (CHECK, FK, UNIQUE) des règles métier
--    4. Index
--    5. Fonctions + triggers de traçabilité et de contrôle métier
--    6. Vues du tableau de bord et du score de priorité d'irrigation
--
--  Rebuild :  psql -U agriwater -d agriwater -f database/schema.sql
-- =============================================================================

BEGIN;

-- Nettoyage total (idempotence)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO agriwater;
GRANT ALL ON SCHEMA public TO public;
SET search_path TO public;


-- =============================================================================
--  1. TYPES ENUM
-- =============================================================================

CREATE TYPE area_unit          AS ENUM ('m2', 'ha');
CREATE TYPE water_unit         AS ENUM ('L', 'm3');

CREATE TYPE farm_status        AS ENUM ('active', 'suspendue', 'inactive');

CREATE TYPE plot_status        AS ENUM ('disponible', 'en_culture', 'en_repos', 'indisponible');
CREATE TYPE crop_status        AS ENUM ('actif', 'inactif');
CREATE TYPE input_status       AS ENUM ('actif', 'inactif');

CREATE TYPE campaign_status    AS ENUM ('planifiee', 'active', 'suspendue', 'terminee', 'annulee');

CREATE TYPE water_source_type  AS ENUM ('puits', 'citerne', 'bassin', 'reservoir',
                                        'canal', 'riviere', 'reserve_pluie');
CREATE TYPE water_source_status AS ENUM ('active', 'maintenance', 'indisponible');

CREATE TYPE water_movement_type AS ENUM ('stock_initial', 'remplissage', 'ajout_manuel',
                                        'consommation', 'perte', 'ajustement',
                                        'correction', 'vidange', 'transfert');

CREATE TYPE irrigation_status  AS ENUM ('brouillon', 'planifiee', 'en_attente_validation',
                                        'validee', 'realisee', 'annulee', 'refusee');
CREATE TYPE irrigation_method  AS ENUM ('arrosage_manuel', 'goutte_a_goutte', 'aspersion',
                                        'gravitaire', 'tuyau', 'pompe', 'autre');
CREATE TYPE priority_level     AS ENUM ('faible', 'normale', 'elevee', 'critique');
CREATE TYPE schedule_status    AS ENUM ('planifiee', 'realisee', 'reportee', 'annulee');

CREATE TYPE activity_type      AS ENUM ('preparation_sol', 'semis', 'repiquage', 'fertilisation',
                                        'traitement', 'desherbage', 'irrigation', 'entretien',
                                        'recolte', 'observation', 'nettoyage', 'autre');

CREATE TYPE input_category     AS ENUM ('semence', 'engrais', 'compost', 'produit_phytosanitaire',
                                        'carburant', 'consommable', 'tuyau', 'piece_pompe',
                                        'traitement_eau');
CREATE TYPE stock_movement_type AS ENUM ('stock_initial', 'entree', 'sortie', 'consommation', 'ajustement');

CREATE TYPE expense_category   AS ENUM ('semences', 'engrais', 'carburant', 'reparation_pompe',
                                        'materiel', 'main_oeuvre', 'transport',
                                        'energie_electrique', 'achat_eau', 'traitement');

CREATE TYPE alert_type         AS ENUM ('eau_critique', 'stock_critique', 'campagne_a_risque', 'systeme');
CREATE TYPE alert_severity     AS ENUM ('info', 'avertissement', 'critique');


-- =============================================================================
--  2. FONCTIONS UTILITAIRES
-- =============================================================================

-- 2.1 Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION agriwater_set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- 2.2 Conversion de superficie en m² (normalisation m² / hectare)
CREATE OR REPLACE FUNCTION agriwater_to_m2(area numeric, unit area_unit) RETURNS numeric
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE unit WHEN 'ha' THEN area * 10000 ELSE area END;
$$;

-- 2.3 Seuil (en litres) au-delà duquel un agent doit faire valider son irrigation
--     Surchargeable : ALTER DATABASE agriwater SET agriwater.manager_validation_threshold = '2000';
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

-- 2.4 Poids numérique de la priorité manuelle (module personnel § 6.10)
CREATE OR REPLACE FUNCTION agriwater_priority_weight(p priority_level) RETURNS integer
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE p
        WHEN 'faible'   THEN 0
        WHEN 'normale'  THEN 10
        WHEN 'elevee'   THEN 20
        WHEN 'critique' THEN 30
    END;
$$;


-- =============================================================================
--  3. TABLES MÉTIER
-- =============================================================================

-- -----------------------------------------------------------------------------
--  3.1 roles — Rôles et permissions (3 profils du CDC § 5)
-- -----------------------------------------------------------------------------
CREATE TABLE roles (
    id          bigserial PRIMARY KEY,
    name        varchar(50)  NOT NULL,
    description text,
    permissions jsonb        NOT NULL DEFAULT '[]'::jsonb,
    created_at  timestamptz  NOT NULL DEFAULT now(),
    updated_at  timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT roles_name_key UNIQUE (name),
    CONSTRAINT roles_name_check CHECK (name IN ('administrateur', 'responsable', 'agent'))
);

COMMENT ON TABLE roles IS 'Rôles applicatifs : administrateur, responsable, agent (CDC § 5).';

-- -----------------------------------------------------------------------------
--  3.2 farms — Exploitations agricoles (CDC § 6.1)
--      manager_id est ajouté après création de users (dépendance circulaire)
-- -----------------------------------------------------------------------------
CREATE TABLE farms (
    id         bigserial PRIMARY KEY,
    name       varchar(150) NOT NULL,
    location   varchar(255) NOT NULL,
    type       varchar(50)  NOT NULL DEFAULT 'maraichage',
    total_area numeric(12,2) NOT NULL DEFAULT 0,
    manager_id bigint,                    -- FK ajoutée plus bas (§ 3.22)
    status     farm_status NOT NULL DEFAULT 'active',
    created_at timestamptz  NOT NULL DEFAULT now(),
    updated_at timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT farms_name_key UNIQUE (name),
    CONSTRAINT farms_total_area_check CHECK (total_area >= 0)
);

COMMENT ON TABLE farms IS 'Exploitations agricoles. Racine du cloisonnement multi-exploitations (RM-01).';

-- -----------------------------------------------------------------------------
--  3.3 users — Comptes utilisateurs (CDC § 6.2)
--      farm_id nullable : l'administrateur global n'appartient à aucune exploitation
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id                bigserial PRIMARY KEY,
    farm_id           bigint,
    role_id           bigint       NOT NULL,
    name              varchar(150) NOT NULL,
    email             varchar(255) NOT NULL,
    password          varchar(255) NOT NULL,
    email_verified_at timestamptz,
    phone             varchar(30),
    is_active         boolean      NOT NULL DEFAULT true,
    last_login_at     timestamptz,
    remember_token    varchar(100),
    created_at        timestamptz  NOT NULL DEFAULT now(),
    updated_at        timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_farm_id_fkey  FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE SET NULL,
    CONSTRAINT users_role_id_fkey  FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT
);

COMMENT ON TABLE users IS 'Comptes utilisateurs. farm_id nullable = administrateur global.';

-- -----------------------------------------------------------------------------
--  3.4 crops — Catalogue des cultures (CDC § 6.4)
--      Table globale, non cloisonnée par exploitation
-- -----------------------------------------------------------------------------
CREATE TABLE crops (
    id                      bigserial PRIMARY KEY,
    name                    varchar(100) NOT NULL,
    category                varchar(50)  NOT NULL,
    estimated_duration_days integer      NOT NULL,
    water_requirement       numeric(10,2) NOT NULL DEFAULT 0,
    production_unit         varchar(30)  NOT NULL DEFAULT 'kg',
    status                  crop_status  NOT NULL DEFAULT 'actif',
    created_at              timestamptz  NOT NULL DEFAULT now(),
    updated_at              timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT crops_name_key UNIQUE (name),
    CONSTRAINT crops_duration_check CHECK (estimated_duration_days > 0),
    CONSTRAINT crops_water_requirement_check CHECK (water_requirement >= 0)
);

COMMENT ON TABLE crops IS 'Catalogue global des cultures et de leur besoin en eau (module priorité § 6.10).';

-- -----------------------------------------------------------------------------
--  3.5 plots — Parcelles maraîchères (CDC § 6.3)
-- -----------------------------------------------------------------------------
CREATE TABLE plots (
    id              bigserial PRIMARY KEY,
    farm_id         bigint       NOT NULL,
    code            varchar(50)  NOT NULL,
    name            varchar(150) NOT NULL,
    area            numeric(12,2) NOT NULL,
    area_unit       area_unit    NOT NULL DEFAULT 'm2',
    location        varchar(255),
    soil_type       varchar(100),
    status          plot_status  NOT NULL DEFAULT 'disponible',
    manual_priority priority_level NOT NULL DEFAULT 'normale',   -- module personnel § 6.10
    soil_moisture   numeric(5,2),                                -- module personnel § 6.10
    created_at      timestamptz  NOT NULL DEFAULT now(),
    updated_at      timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT plots_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE,
    CONSTRAINT plots_farm_code_key UNIQUE (farm_id, code),   -- unicité dans l'exploitation
    CONSTRAINT plots_area_check CHECK (area > 0),
    CONSTRAINT plots_moisture_check CHECK (soil_moisture IS NULL OR soil_moisture BETWEEN 0 AND 100)
);

COMMENT ON TABLE plots IS 'Parcelles. manual_priority et soil_moisture alimentent le score de priorité § 6.10.';

-- -----------------------------------------------------------------------------
--  3.6 campaigns — Cycles de production (CDC § 6.5)
-- -----------------------------------------------------------------------------
CREATE TABLE campaigns (
    id                bigserial PRIMARY KEY,
    farm_id           bigint       NOT NULL,
    plot_id           bigint       NOT NULL,
    crop_id           bigint       NOT NULL,
    manager_id        bigint,
    code              varchar(60)  NOT NULL,
    name              varchar(150) NOT NULL,
    start_date        date         NOT NULL,
    expected_end_date date         NOT NULL,
    actual_end_date   date,
    area              numeric(12,2) NOT NULL,
    status            campaign_status NOT NULL DEFAULT 'planifiee',
    notes             text,
    created_at        timestamptz  NOT NULL DEFAULT now(),
    updated_at        timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT campaigns_farm_id_fkey  FOREIGN KEY (farm_id)  REFERENCES farms (id)  ON DELETE CASCADE,
    CONSTRAINT campaigns_plot_id_fkey  FOREIGN KEY (plot_id)  REFERENCES plots (id)  ON DELETE RESTRICT,
    CONSTRAINT campaigns_crop_id_fkey  FOREIGN KEY (crop_id)  REFERENCES crops (id)  ON DELETE RESTRICT,
    CONSTRAINT campaigns_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT campaigns_farm_code_key UNIQUE (farm_id, code),
    CONSTRAINT campaigns_area_check CHECK (area > 0),
    CONSTRAINT campaigns_dates_check CHECK (expected_end_date >= start_date),
    CONSTRAINT campaigns_actual_end_check CHECK (actual_end_date IS NULL OR actual_end_date >= start_date)
);

COMMENT ON TABLE campaigns IS 'Campagnes agricoles : production d''une culture sur une parcelle et une période.';

-- -----------------------------------------------------------------------------
--  3.7 water_sources — Puits, citernes, bassins, réservoirs (CDC § 6.6)
-- -----------------------------------------------------------------------------
CREATE TABLE water_sources (
    id                  bigserial PRIMARY KEY,
    farm_id             bigint        NOT NULL,
    name                varchar(150)  NOT NULL,
    type                water_source_type NOT NULL,
    capacity            numeric(14,2) NOT NULL,
    available_quantity  numeric(14,2) NOT NULL DEFAULT 0,
    unit                water_unit    NOT NULL DEFAULT 'L',
    critical_threshold  numeric(14,2) NOT NULL DEFAULT 0,
    location            varchar(255),
    status              water_source_status NOT NULL DEFAULT 'active',
    created_at          timestamptz   NOT NULL DEFAULT now(),
    updated_at          timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT water_sources_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE,
    CONSTRAINT water_sources_farm_name_key UNIQUE (farm_id, name),
    -- RM-04 : le stock d'eau ne peut jamais être négatif
    CONSTRAINT water_sources_available_check CHECK (available_quantity >= 0),
    -- RM-05 : la quantité disponible ne peut pas dépasser la capacité
    CONSTRAINT water_sources_capacity_check CHECK (available_quantity <= capacity),
    CONSTRAINT water_sources_capacity_positive_check CHECK (capacity > 0),
    -- le seuil critique est cohérent avec la capacité
    CONSTRAINT water_sources_threshold_check CHECK (critical_threshold >= 0 AND critical_threshold <= capacity)
);

COMMENT ON TABLE water_sources IS 'Ressources en eau. Contrainte centrale du projet : available_quantity >= 0 (RM-04).';

-- -----------------------------------------------------------------------------
--  3.8 irrigation_schedules — Planification (CDC § 6.9)
-- -----------------------------------------------------------------------------
CREATE TABLE irrigation_schedules (
    id                  bigserial PRIMARY KEY,
    farm_id             bigint        NOT NULL,
    campaign_id         bigint        NOT NULL,
    plot_id             bigint        NOT NULL,
    water_source_id     bigint        NOT NULL,
    agent_id            bigint        NOT NULL,
    scheduled_date      date          NOT NULL,
    scheduled_time      time,
    estimated_quantity  numeric(14,2) NOT NULL,
    priority            priority_level NOT NULL DEFAULT 'normale',
    status              schedule_status NOT NULL DEFAULT 'planifiee',
    comment             text,
    created_at          timestamptz   NOT NULL DEFAULT now(),
    updated_at          timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT irrigation_schedules_farm_id_fkey         FOREIGN KEY (farm_id)         REFERENCES farms (id)         ON DELETE CASCADE,
    CONSTRAINT irrigation_schedules_campaign_id_fkey     FOREIGN KEY (campaign_id)     REFERENCES campaigns (id)     ON DELETE RESTRICT,
    CONSTRAINT irrigation_schedules_plot_id_fkey         FOREIGN KEY (plot_id)         REFERENCES plots (id)         ON DELETE RESTRICT,
    CONSTRAINT irrigation_schedules_water_source_id_fkey FOREIGN KEY (water_source_id) REFERENCES water_sources (id) ON DELETE RESTRICT,
    CONSTRAINT irrigation_schedules_agent_id_fkey        FOREIGN KEY (agent_id)        REFERENCES users (id)         ON DELETE RESTRICT,
    CONSTRAINT irrigation_schedules_estimated_check CHECK (estimated_quantity > 0)
);

COMMENT ON TABLE irrigation_schedules IS 'Intentions d''irrigation. N''a aucun effet sur le stock d''eau.';

-- -----------------------------------------------------------------------------
--  3.9 irrigations — Séances réalisées (CDC § 6.8) — cœur du projet
-- -----------------------------------------------------------------------------
CREATE TABLE irrigations (
    id                bigserial PRIMARY KEY,
    farm_id           bigint       NOT NULL,
    campaign_id       bigint       NOT NULL,
    plot_id           bigint       NOT NULL,
    water_source_id   bigint       NOT NULL,
    performed_by      bigint       NOT NULL,
    validated_by      bigint,                    -- responsable validateur (RM-10)
    scheduled_at      timestamptz,
    performed_at      timestamptz  NOT NULL DEFAULT now(),
    quantity          numeric(14,2) NOT NULL,
    unit              water_unit   NOT NULL DEFAULT 'L',
    duration_minutes  integer,
    method            irrigation_method NOT NULL,
    status            irrigation_status  NOT NULL DEFAULT 'brouillon',
    observation       text,
    created_at        timestamptz  NOT NULL DEFAULT now(),
    updated_at        timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT irrigations_farm_id_fkey          FOREIGN KEY (farm_id)         REFERENCES farms (id)         ON DELETE CASCADE,
    CONSTRAINT irrigations_campaign_id_fkey      FOREIGN KEY (campaign_id)     REFERENCES campaigns (id)     ON DELETE RESTRICT,
    CONSTRAINT irrigations_plot_id_fkey          FOREIGN KEY (plot_id)         REFERENCES plots (id)         ON DELETE RESTRICT,
    CONSTRAINT irrigations_water_source_id_fkey  FOREIGN KEY (water_source_id) REFERENCES water_sources (id) ON DELETE RESTRICT,
    CONSTRAINT irrigations_performed_by_fkey     FOREIGN KEY (performed_by)    REFERENCES users (id)         ON DELETE RESTRICT,
    CONSTRAINT irrigations_validated_by_fkey     FOREIGN KEY (validated_by)    REFERENCES users (id)         ON DELETE SET NULL,
    -- RM-03 : la quantité d'irrigation doit être strictement positive
    CONSTRAINT irrigations_quantity_check CHECK (quantity > 0),
    CONSTRAINT irrigations_duration_check CHECK (duration_minutes IS NULL OR duration_minutes > 0)
);

COMMENT ON TABLE irrigations IS 'Séances d''irrigation. Toute ligne consomme le stock de sa ressource (RM-04).';

-- -----------------------------------------------------------------------------
--  3.10 water_movements — Journal traçable des mouvements d'eau (CDC § 6.7, RM-09)
-- -----------------------------------------------------------------------------
CREATE TABLE water_movements (
    id              bigserial PRIMARY KEY,
    farm_id         bigint       NOT NULL,
    water_source_id bigint       NOT NULL,
    campaign_id     bigint,
    irrigation_id   bigint,
    user_id         bigint       NOT NULL,
    type            water_movement_type NOT NULL,
    quantity        numeric(14,2) NOT NULL,
    quantity_before numeric(14,2) NOT NULL,
    quantity_after  numeric(14,2) NOT NULL,
    movement_date   timestamptz  NOT NULL DEFAULT now(),
    note            text,
    created_at      timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT water_movements_farm_id_fkey         FOREIGN KEY (farm_id)         REFERENCES farms (id)         ON DELETE CASCADE,
    CONSTRAINT water_movements_water_source_id_fkey FOREIGN KEY (water_source_id) REFERENCES water_sources (id) ON DELETE RESTRICT,
    CONSTRAINT water_movements_campaign_id_fkey     FOREIGN KEY (campaign_id)     REFERENCES campaigns (id)     ON DELETE SET NULL,
    CONSTRAINT water_movements_irrigation_id_fkey   FOREIGN KEY (irrigation_id)   REFERENCES irrigations (id)   ON DELETE CASCADE,
    CONSTRAINT water_movements_user_id_fkey         FOREIGN KEY (user_id)         REFERENCES users (id)         ON DELETE RESTRICT,
    -- la quantité déplacée est une valeur absolue ; le solde est cohérent
    CONSTRAINT water_movements_quantity_check CHECK (quantity > 0),
    CONSTRAINT water_movements_before_check CHECK (quantity_before >= 0),
    CONSTRAINT water_movements_after_check  CHECK (quantity_after  >= 0),
    CONSTRAINT water_movements_delta_check
        CHECK (quantity_after = quantity_before + quantity
            OR quantity_after = quantity_before - quantity)
);

COMMENT ON TABLE water_movements IS 'Journal append-only. Une entrée par variation de water_sources.available_quantity (RM-09).';

-- -----------------------------------------------------------------------------
--  3.11 activities — Activités techniques (CDC § 6.11)
-- -----------------------------------------------------------------------------
CREATE TABLE activities (
    id            bigserial PRIMARY KEY,
    farm_id       bigint      NOT NULL,
    campaign_id   bigint,
    plot_id       bigint      NOT NULL,
    user_id       bigint      NOT NULL,
    type          activity_type NOT NULL,
    activity_date date        NOT NULL,
    description   text,
    cost          numeric(12,2),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT activities_farm_id_fkey     FOREIGN KEY (farm_id)   REFERENCES farms (id)     ON DELETE CASCADE,
    CONSTRAINT activities_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE SET NULL,
    CONSTRAINT activities_plot_id_fkey     FOREIGN KEY (plot_id)   REFERENCES plots (id)     ON DELETE RESTRICT,
    CONSTRAINT activities_user_id_fkey     FOREIGN KEY (user_id)   REFERENCES users (id)     ON DELETE RESTRICT,
    CONSTRAINT activities_cost_check CHECK (cost IS NULL OR cost >= 0)
);

COMMENT ON TABLE activities IS 'Activités techniques : semis, fertilisation, récolte, irrigation…';

-- -----------------------------------------------------------------------------
--  3.12 inputs — Intrants agricoles (CDC § 6.12)
-- -----------------------------------------------------------------------------
CREATE TABLE inputs (
    id                 bigserial PRIMARY KEY,
    farm_id            bigint         NOT NULL,
    name               varchar(150)   NOT NULL,
    category           input_category NOT NULL,
    unit               varchar(20)    NOT NULL DEFAULT 'kg',
    minimum_threshold  numeric(12,2)  NOT NULL DEFAULT 0,
    available_quantity numeric(12,2)  NOT NULL DEFAULT 0,
    unit_price         numeric(12,2)  NOT NULL DEFAULT 0,
    supplier           varchar(150),
    status             input_status   NOT NULL DEFAULT 'actif',
    created_at         timestamptz    NOT NULL DEFAULT now(),
    updated_at         timestamptz    NOT NULL DEFAULT now(),
    CONSTRAINT inputs_farm_id_fkey     FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE CASCADE,
    CONSTRAINT inputs_farm_name_key    UNIQUE (farm_id, name),
    -- RM-12 : le stock d'intrant ne peut jamais être négatif
    CONSTRAINT inputs_available_check  CHECK (available_quantity >= 0),
    CONSTRAINT inputs_threshold_check  CHECK (minimum_threshold >= 0),
    CONSTRAINT inputs_price_check      CHECK (unit_price >= 0)
);

COMMENT ON TABLE inputs IS 'Intrants : semences, engrais, produits phytosanitaires, carburant…';

-- -----------------------------------------------------------------------------
--  3.13 stock_movements — Mouvements d'intrants (CDC § 6.12)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
--  3.14 harvests — Récoltes (CDC § 6.14)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
--  3.15 expenses — Dépenses (CDC § 6.13)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
--  3.16 revenues — Recettes (CDC § 6.13)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
--  3.17 alerts — Alertes métier (CDC § 14, RM-08)
-- -----------------------------------------------------------------------------
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
    -- une alerte porte sur un et un seul objet
    CONSTRAINT alerts_single_target_check CHECK (
        num_nonnulls(water_source_id, input_id, campaign_id) = 1
    ),
    CONSTRAINT alerts_read_check CHECK (
        (is_read = false AND read_at IS NULL) OR (is_read = true AND read_at IS NOT NULL)
    )
);

COMMENT ON TABLE alerts IS 'Alertes : eau critique, stock critique, campagne à risque, système.';

-- -----------------------------------------------------------------------------
--  3.18 activity_logs — Journal des opérations sensibles (CDC § 18)
-- -----------------------------------------------------------------------------
CREATE TABLE activity_logs (
    id          bigserial PRIMARY KEY,
    farm_id     bigint,
    user_id     bigint,
    action      varchar(100) NOT NULL,
    entity_type varchar(100) NOT NULL,
    entity_id   bigint      NOT NULL,
    description text,
    ip_address  inet,
    user_agent  varchar(255),
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT activity_logs_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES farms (id) ON DELETE SET NULL,
    CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

COMMENT ON TABLE activity_logs IS 'Journal d''audit des accès et opérations sensibles (tentative de fuite inter-exploitation…).';


-- =============================================================================
--  3.22 CLÔTURE DE LA DÉPENDANCE CIRCULAIRE  Farm.manager_id -> users.id
-- =============================================================================
ALTER TABLE farms
    ADD CONSTRAINT farms_manager_id_fkey
    FOREIGN KEY (manager_id) REFERENCES users (id) ON DELETE SET NULL;


-- =============================================================================
--  4. TABLES TECHNIQUES LARAVEL
-- =============================================================================

CREATE TABLE password_reset_tokens (
    email      varchar(255) PRIMARY KEY,
    token      varchar(255) NOT NULL,
    created_at timestamptz  DEFAULT NULL
);

CREATE TABLE sessions (
    id            varchar(255) PRIMARY KEY,
    user_id       bigint,
    ip_address    varchar(45),
    user_agent    text,
    payload       text NOT NULL,
    last_activity integer NOT NULL
);

CREATE TABLE cache (
    key        varchar(255) PRIMARY KEY,
    value      text NOT NULL,
    expiration integer NOT NULL
);

CREATE TABLE cache_locks (
    key        varchar(255) PRIMARY KEY,
    owner      varchar(255) NOT NULL,
    expiration integer NOT NULL
);

CREATE TABLE jobs (
    id           bigserial PRIMARY KEY,
    queue        varchar(255) NOT NULL,
    payload      text NOT NULL,
    attempts     smallint NOT NULL,
    reserved_at  integer,
    available_at integer NOT NULL,
    created_at   integer NOT NULL
);

CREATE TABLE job_batches (
    id            varchar(255) PRIMARY KEY,
    name          varchar(255) NOT NULL,
    total_jobs    integer NOT NULL,
    pending_jobs  integer NOT NULL,
    failed_jobs   integer NOT NULL,
    failed_job_ids text NOT NULL,
    options       text,
    cancelled_at  integer,
    created_at    integer NOT NULL,
    finished_at   integer
);

CREATE TABLE failed_jobs (
    id         bigserial PRIMARY KEY,
    uuid       varchar(255) NOT NULL,
    connection text NOT NULL,
    queue      text NOT NULL,
    payload    text NOT NULL,
    exception  text NOT NULL,
    failed_at  timestamptz DEFAULT now()
);

CREATE TABLE notifications (
    uuid            uuid PRIMARY KEY,
    type            varchar(255) NOT NULL,
    notifiable_type varchar(255) NOT NULL,
    notifiable_id   bigint      NOT NULL,
    data            text        NOT NULL,
    read_at         timestamptz,
    created_at      timestamptz
);


-- =============================================================================
--  5. INDEX
-- =============================================================================

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
CREATE INDEX jobs_queue_index              ON jobs (queue);
CREATE INDEX cache_expiration_index        ON cache (expiration);


-- =============================================================================
--  6. TRIGGERS ET CONTRÔLES MÉTIER
-- =============================================================================

-- 6.1 updated_at automatique
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

-- -----------------------------------------------------------------------------
-- 6.2 RM-01 / cohérence — le responsable appartient à sa propre exploitation
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agriwater_check_farm_manager() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_farm_id bigint;
BEGIN
    IF NEW.manager_id IS NULL THEN
        RETURN NULL;
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

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_farms_manager_check
    BEFORE INSERT OR UPDATE OF manager_id ON farms
    FOR EACH ROW EXECUTE FUNCTION agriwater_check_farm_manager();

-- -----------------------------------------------------------------------------
-- 6.3 RM-01 — la parcelle d'une campagne appartient à la même exploitation
-- -----------------------------------------------------------------------------
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
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_campaigns_plot_check
    BEFORE INSERT OR UPDATE OF plot_id, farm_id ON campaigns
    FOR EACH ROW EXECUTE FUNCTION agriwater_check_campaign_plot();

-- -----------------------------------------------------------------------------
-- 6.4 RM-01 / RM-02 / RM-06 / RM-07 — cohérence d'une irrigation
-- -----------------------------------------------------------------------------
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

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_irrigations_coherence_check
    BEFORE INSERT OR UPDATE ON irrigations
    FOR EACH ROW EXECUTE FUNCTION agriwater_check_irrigation_coherence();

-- -----------------------------------------------------------------------------
-- 6.5 RM-10 — validation obligatoire du responsable au-delà d'un seuil
-- -----------------------------------------------------------------------------
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
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_irrigations_manager_validation_check
    BEFORE INSERT OR UPDATE OF status, quantity, validated_by ON irrigations
    FOR EACH ROW EXECUTE FUNCTION agriwater_check_manager_validation();

-- -----------------------------------------------------------------------------
-- 6.6 RM-09 — toute variation du stock d'eau doit être tracée
-- -----------------------------------------------------------------------------
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

CREATE CONSTRAINT TRIGGER trg_water_sources_movement_trace
    AFTER UPDATE OF available_quantity ON water_sources
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION agriwater_assert_movement_trace();

-- -----------------------------------------------------------------------------
-- 6.7 RM-08 — alerte automatique au passage sous le seuil critique
-- -----------------------------------------------------------------------------
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

CREATE CONSTRAINT TRIGGER trg_water_sources_critical_alert
    AFTER UPDATE OF available_quantity ON water_sources
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION agriwater_alert_critical_water();

-- -----------------------------------------------------------------------------
-- 6.8 RM-11 — une campagne terminée n'accepte plus d'opérations
-- -----------------------------------------------------------------------------
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
    RETURN NULL;
END;
$$;

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

-- -----------------------------------------------------------------------------
-- 6.9 RM-13 — quantité vendue plafonnée par la quantité récoltée
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agriwater_check_revenue_vs_harvest() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    h          harvests%ROWTYPE;
    v_deja     numeric := 0;
    v_restant  numeric;
BEGIN
    IF NEW.harvest_id IS NULL OR NEW.quantity IS NULL THEN
        RETURN NULL;
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

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_revenues_harvest_check
    BEFORE INSERT OR UPDATE OF quantity, harvest_id ON revenues
    FOR EACH ROW EXECUTE FUNCTION agriwater_check_revenue_vs_harvest();

-- -----------------------------------------------------------------------------
-- 6.10 Cohérence inter-exploitation des autres entités cloisonnées (RM-01)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agriwater_check_same_farm() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    v_table  text := TG_ARGV[0];
    v_column text := TG_ARGV[1];
    v_farm   bigint;
BEGIN
    IF NEW.campaign_id IS NULL THEN
        RETURN NULL;
    END IF;

    EXECUTE format('SELECT farm_id FROM %I WHERE id = $1', v_table) INTO v_farm USING NEW.campaign_id;

    IF v_farm IS DISTINCT FROM NEW.farm_id THEN
        RAISE EXCEPTION 'RM-01 : l''objet % de type % appartient à l''exploitation %, pas à l''exploitation %',
            NEW.campaign_id, v_table, v_farm, NEW.farm_id
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NULL;
END;
$$;

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

-- -----------------------------------------------------------------------------
-- 6.11 Journalisation automatique des accès et opérations sensibles
-- -----------------------------------------------------------------------------
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
        format('%s sur %s (id=%)', TG_OP, TG_TABLE_NAME, NEW.id)
    );
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_irrigations_log
    AFTER INSERT OR UPDATE OF status ON irrigations
    FOR EACH ROW EXECUTE FUNCTION agriwater_log_operation();

CREATE TRIGGER trg_water_sources_log
    AFTER INSERT OR UPDATE ON water_sources
    FOR EACH ROW EXECUTE FUNCTION agriwater_log_operation();


-- =============================================================================
--  7. VUES DU TABLEAU DE BORD ET INDICATEURS
-- =============================================================================

-- 7.1 Indicateurs principaux par exploitation (CDC § 9.1)
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

-- 7.2 Indicateur 1 — consommation d'eau par campagne (CDC § 9.2)
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

-- 7.3 Indicateur 2 — consommation d'eau par m² (CDC § 9.2)
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

-- 7.4 Indicateur 3 — autonomie estimée de la réserve (CDC § 9.2)
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

-- 7.5 Indicateur 4 — taux de réalisation des irrigations planifiées (CDC § 9.2)
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

-- 7.6 Module personnel — score de priorité d'irrigation (CDC § 6.10)
--     Score = (jours sans irrigation × 4) + besoin en eau de la culture
--             + poids de la priorité manuelle + bonus faible humidité
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

-- 7.7 Vue relationnelle complète des irrigations (API REST, exports, rapports)
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

COMMIT;