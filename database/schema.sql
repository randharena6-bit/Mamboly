-- =============================================================================
--  AgriWater — Schéma PostgreSQL complet
--  Plateforme SaaS de gestion de l'irrigation, des ressources en eau
--  et des campagnes maraîchères.
--
--  Source      : CDC.md (cahier des charges) + MCD-UML.md (modèle conceptuel)
--  Réf. modèle : 19 entités, 40 associations, 13 règles métier (RM-01 à RM-13)
--  Compatible  : PostgreSQL 13+ (testé sur 16)
--
--  Organisation en deux schémas SQL :
--    • agriwater : domaine métier (18 tables, types, domaines, fonctions,
--                  vues, triggers). Toutes les vues du tableau de bord.
--    • public    : infrastructure Laravel (sessions, cache, files de jobs,
--                  notifications). Aucun objet métier n'y réside.
--
--  Contenu :
--    1. Types ENUM natifs + types DOMAIN (cohérence des unités)
--    2. Tables métier partitionnées (water_movements, activities, activity_logs)
--    3. Contraintes d'intégrité (CHECK, FK, UNIQUE) des règles métier
--    4. Index
--    5. Fonctions + triggers de traçabilité et de contrôle métier
--    6. Procédures métier (irrigation, planification, clôture de campagne)
--    7. Vues du tableau de bord et du score de priorité d'irrigation
--    8. Documentation de toutes les colonnes (COMMENT ON COLUMN)
--
--  Rebuild :  psql -U agriwater -d agriwater -f database/schema.sql
-- =============================================================================

BEGIN;

-- Nettoyage total (idempotence).
-- agriwater d'abord : ses clés étrangères pointent vers public.
DROP SCHEMA IF EXISTS agriwater CASCADE;
DROP SCHEMA public CASCADE;

CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO agriwater;
GRANT ALL ON SCHEMA public TO public;

CREATE SCHEMA agriwater AUTHORIZATION agriwater;
COMMENT ON SCHEMA agriwater IS
    'Domaine métier AgriWater : exploitations, eau, campagnes, finance, journal d''audit.';

GRANT ALL ON SCHEMA agriwater TO agriwater;

-- Toutes les écritures non qualifiées de ce fichier visent agriwater.
SET search_path TO agriwater, public;


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
--  1b. TYPES DOMAIN — cohérent par construction, pas seulement par convention
--
--  Un domaine PostgreSQL porte une contrainte qui s'applique partout où la
--  colonne est utilisée : impossible d'enregistrer un montant négatif ou une
--  surface aberrante, même en contournant l'application.
-- =============================================================================

-- Montant en Ariary (2 décimales, jamais négatif)
CREATE DOMAIN montant AS numeric(14,2)
    CONSTRAINT montant_non_negatif CHECK (VALUE >= 0)
    CONSTRAINT montant_plafond      CHECK (VALUE < 1000000000000);
COMMENT ON DOMAIN montant IS 'Montant monétaire en Ariary, non négatif.';

-- Quantité physique mesurée (eau en L, intrants en kg/L/m) : jamais négative
CREATE DOMAIN quantite AS numeric(14,2)
    CONSTRAINT quantite_non_negative CHECK (VALUE >= 0);
COMMENT ON DOMAIN quantite IS 'Quantité physique non négative (unité portée par une colonne voisine).';

-- Surface exprimée en m² (normalisée par agriwater_to_m2)
CREATE DOMAIN surface_m2 AS numeric(14,2)
    CONSTRAINT surface_m2_non_negative CHECK (VALUE >= 0);
COMMENT ON DOMAIN surface_m2 IS 'Surface en mètres carrés, non négative.';

-- Pourcentage 0-100 (humidité du sol, taux de réalisation)
CREATE DOMAIN pourcentage AS numeric(5,2)
    CONSTRAINT pourcentage_borné CHECK (VALUE BETWEEN 0 AND 100);
COMMENT ON DOMAIN pourcentage IS 'Pourcentage entre 0 et 100.';

-- Durée en minutes
CREATE DOMAIN duree_minutes AS integer
    CONSTRAINT duree_minutes_positive CHECK (VALUE > 0);
COMMENT ON DOMAIN duree_minutes IS 'Durée en minutes, strictement positive.';


-- =============================================================================
--  2. FONCTIONS UTILITAIRES
-- =============================================================================

-- 2.1 Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION agriwater_set_updated_at() RETURNS trigger
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- 2.2 Conversion de superficie en m² (normalisation m² / hectare)
CREATE OR REPLACE FUNCTION agriwater_to_m2(area numeric, unit area_unit) RETURNS numeric
LANGUAGE sql IMMUTABLE
    SET search_path = agriwater, public AS $$
    SELECT CASE unit WHEN 'ha' THEN area * 10000 ELSE area END;
$$;

-- 2.3 Seuil (en litres) au-delà duquel un agent doit faire valider son irrigation
--     Surchargeable : ALTER DATABASE agriwater SET agriwater.manager_validation_threshold = '2000';
CREATE OR REPLACE FUNCTION agriwater_manager_validation_threshold() RETURNS numeric
LANGUAGE plpgsql STABLE
    SET search_path = agriwater, public AS $$
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
LANGUAGE sql IMMUTABLE
    SET search_path = agriwater, public AS $$
    SELECT CASE p
        WHEN 'faible'   THEN 0
        WHEN 'normale'  THEN 10
        WHEN 'elevee'   THEN 20
        WHEN 'critique' THEN 30
    END;
$$;

-- 2.5 Gestion automatique du partitionnement
--
--     Trois tables append-only sont partitionnées par mois :
--       water_movements (movement_date), activities (activity_date),
--       activity_logs (created_at).
--
--     CREATE TABLE ... PARTITION OF échoue si la partition par défaut contient
--     déjà des lignes de la période visée. On procède donc en trois temps :
--       1. table autonome intermédiaire,
--       2. bascule des lignes concernées depuis la partition par défaut,
--       3. ATTACH PARTITION (PostgreSQL revalide le périmètre et crée les index).
--
--     C'est le même algorithme que pg_partman, sans extension à installer.

-- 2.5.1 Crée (si besoin) la partition mensuelle d'une table partitionnée
CREATE OR REPLACE FUNCTION agriwater_create_month_partition(p_table text, p_month date)
RETURNS text
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
DECLARE
    v_parent  text;
    v_key     text;
    v_part    text;
    v_name    text;
    v_lo      timestamptz := date_trunc('month', p_month)::timestamptz;
    v_hi      timestamptz := (date_trunc('month', p_month) + interval '1 month')::timestamptz;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'agriwater' AND c.relname = p_table AND c.relkind = 'p') THEN
        RAISE EXCEPTION 'Table non partitionnée : %', p_table
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- colonne de partitionnement, dérivée du nom de la table
    v_key := CASE p_table
                WHEN 'water_movements' THEN 'movement_date'
                WHEN 'activities'      THEN 'activity_date'
                WHEN 'activity_logs'   THEN 'created_at'
             END;
    IF v_key IS NULL THEN
        RAISE EXCEPTION 'Table non partitionnée gérée : %', p_table
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- ATTACH PARTITION conserve le nom de la table rattachée : on crée donc
    -- directement la table sous son nom définitif, ce qui rend la détection
    -- d/idempotence fiable.
    v_name := p_table || '_' || to_char(p_month, 'YYYY_MM');
    IF to_regclass('agriwater.' || quote_ident(v_name)) IS NOT NULL THEN
        RETURN v_name;                                  -- déjà en place
    END IF;

    -- 1. table autonome, calque de la table partitionnée
    --    INCLUDING CONSTRAINTS recopie les CHECK : ATTACH les exige.
    EXECUTE format('CREATE TABLE agriwater.%I (LIKE agriwater.%I INCLUDING CONSTRAINTS)', v_name, p_table);

    -- 2. bascule des lignes éventuellement stockées dans la partition par défaut
    v_part := p_table || '_default';
    IF to_regclass('agriwater.' || quote_ident(v_part)) IS NOT NULL THEN
        EXECUTE format(
            'WITH moved AS (
                 DELETE FROM agriwater.%I WHERE %I >= $1 AND %I < $2 RETURNING *
             ) INSERT INTO agriwater.%I SELECT * FROM moved',
            v_part, v_key, v_key, v_name)
        USING v_lo, v_hi;
    END IF;

    -- 3. rattachement : PostgreSQL revalide le périmètre et propage les index
    --    du parent à la nouvelle partition, automatiquement et définitivement.
    EXECUTE format(
        'ALTER TABLE agriwater.%I ATTACH PARTITION agriwater.%I FOR VALUES FROM (%L) TO (%L)',
        p_table, v_name, v_lo, v_hi);

    RETURN v_name;
END;
$$;

COMMENT ON FUNCTION agriwater_create_month_partition(text, date) IS
    'Crée la partition mensuelle manquante d''une table partitionnée et y bascule les lignes de la partition par défaut.';

-- 2.5.2 Prépare les N prochains mois (rolling window)
CREATE OR REPLACE FUNCTION agriwater_prepare_partitions(p_months integer DEFAULT 6)
RETURNS integer
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
DECLARE
    m   date;
    n   integer := 0;
    t   text;
BEGIN
    FOR m IN SELECT generate_series(
                    date_trunc('month', CURRENT_DATE)::date,
                    date_trunc('month', CURRENT_DATE)::date + (p_months || ' months')::interval,
                    interval '1 month')::date
             LOOP
        FOREACH t IN ARRAY ARRAY['water_movements', 'activities', 'activity_logs'] LOOP
            PERFORM agriwater_create_month_partition(t, m);
            n := n + 1;
        END LOOP;
    END LOOP;
    RETURN n;
END;
$$;

COMMENT ON FUNCTION agriwater_prepare_partitions(integer) IS
    'Crée à l''avance les partitions mensuelles sur une fenêtre glissante (appelée par agriwater_maintenance).';

-- 2.5.3 Remplit une plage de partitions donnée (bootstrap et tests)
CREATE OR REPLACE FUNCTION agriwater_prepare_partitions_from(p_from date, p_to date)
RETURNS integer
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
DECLARE
    m date;
    n integer := 0;
BEGIN
    FOR m IN SELECT generate_series(date_trunc('month', p_from)::date,
                                   date_trunc('month', p_to)::date,
                                   interval '1 month')::date
             LOOP
        PERFORM agriwater_create_month_partition('water_movements', m);
        PERFORM agriwater_create_month_partition('activities',      m);
        PERFORM agriwater_create_month_partition('activity_logs',   m);
        n := n + 3;
    END LOOP;
    RETURN n;
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
    total_area surface_m2 NOT NULL DEFAULT 0,
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
    water_requirement       quantite  NOT NULL DEFAULT 0,
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
    area            surface_m2  NOT NULL,
    area_unit       area_unit    NOT NULL DEFAULT 'm2',
    location        varchar(255),
    soil_type       varchar(100),
    status          plot_status  NOT NULL DEFAULT 'disponible',
    manual_priority priority_level NOT NULL DEFAULT 'normale',   -- module personnel § 6.10
    soil_moisture   pourcentage,                                -- module personnel § 6.10
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
    area              surface_m2  NOT NULL,
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
    capacity            quantite   NOT NULL,
    available_quantity  quantite   NOT NULL DEFAULT 0,
    unit                water_unit    NOT NULL DEFAULT 'L',
    critical_threshold  quantite   NOT NULL DEFAULT 0,
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
    estimated_quantity  quantite   NOT NULL,
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
    quantity          quantite      NOT NULL,
    unit              water_unit   NOT NULL DEFAULT 'L',
    duration_minutes  duree_minutes,
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
--       TABLE PARTITIONNÉE par mois (RANGE sur movement_date) :
--       le journal ne fait que croître, jamais de mise à jour ni de suppression
--       hors purge. Partitionner permet de purger un mois par DETACH en O(1),
--       d'indexer chaque tranche à la taille du lot, et d'éviter que la table
--       n'enfle au point de dégrader les index.
-- -----------------------------------------------------------------------------
CREATE TABLE water_movements (
    id              bigserial   NOT NULL,
    farm_id         bigint       NOT NULL,
    water_source_id bigint       NOT NULL,
    campaign_id     bigint,
    irrigation_id   bigint,
    user_id         bigint       NOT NULL,
    type            water_movement_type NOT NULL,
    quantity        quantite NOT NULL,
    quantity_before quantite NOT NULL,
    quantity_after  quantite NOT NULL,
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
            OR quantity_after = quantity_before - quantity),
    -- La clé primaire inclut la clé de partition : contrainte imposée par PostgreSQL
    -- qui garantit qu'une clé de ligne est unique dans TOUTE la table partitionnée.
    CONSTRAINT water_movements_pkey PRIMARY KEY (id, movement_date)
) PARTITION BY RANGE (movement_date);

COMMENT ON TABLE water_movements IS 'Journal append-only partitionné par mois. Une entrée par variation de water_sources.available_quantity (RM-09).';

-- -----------------------------------------------------------------------------
--  3.11 activities — Activités techniques (CDC § 6.11)
-- -----------------------------------------------------------------------------
--       TABLE PARTITIONNÉE par mois (RANGE sur activity_date) : même logique
--       que water_movements (écriture seule, forte volumétrie, purge par période).
CREATE TABLE activities (
    id            bigserial NOT NULL,
    farm_id       bigint      NOT NULL,
    campaign_id   bigint,
    plot_id       bigint      NOT NULL,
    user_id       bigint      NOT NULL,
    type          activity_type NOT NULL,
    activity_date date        NOT NULL,
    description   text,
    cost          montant,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT activities_farm_id_fkey     FOREIGN KEY (farm_id)   REFERENCES farms (id)     ON DELETE CASCADE,
    CONSTRAINT activities_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE SET NULL,
    CONSTRAINT activities_plot_id_fkey     FOREIGN KEY (plot_id)   REFERENCES plots (id)     ON DELETE RESTRICT,
    CONSTRAINT activities_user_id_fkey     FOREIGN KEY (user_id)   REFERENCES users (id)     ON DELETE RESTRICT,
    CONSTRAINT activities_cost_check CHECK (cost IS NULL OR cost >= 0),
    CONSTRAINT activities_pkey PRIMARY KEY (id, activity_date)
) PARTITION BY RANGE (activity_date);

COMMENT ON TABLE activities IS 'Activités techniques partitionnées par mois : semis, fertilisation, récolte, irrigation…';

-- -----------------------------------------------------------------------------
--  3.12 inputs — Intrants agricoles (CDC § 6.12)
-- -----------------------------------------------------------------------------
CREATE TABLE inputs (
    id                 bigserial PRIMARY KEY,
    farm_id            bigint         NOT NULL,
    name               varchar(150)   NOT NULL,
    category           input_category NOT NULL,
    unit               varchar(20)    NOT NULL DEFAULT 'kg',
    minimum_threshold  quantite NOT NULL DEFAULT 0,
    available_quantity quantite NOT NULL DEFAULT 0,
    unit_price         montant NOT NULL DEFAULT 0,
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
    quantity      quantite NOT NULL,
    stock_before  quantite NOT NULL,
    stock_after   quantite NOT NULL,
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
    quantity      quantite  NOT NULL,
    unit          varchar(20) NOT NULL DEFAULT 'kg',
    quality       varchar(50),
    loss_quantity quantite  NOT NULL DEFAULT 0,
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
    amount       montant NOT NULL,
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
    amount       montant NOT NULL,
    product      varchar(150),
    quantity     quantite,
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
--       TABLE PARTITIONNÉE par mois (RANGE sur created_at) : journal d'audit,
--       jamais modifié. La rétention se gère par partition (archivage, purge).
CREATE TABLE activity_logs (
    id          bigserial NOT NULL,
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
    CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT activity_logs_pkey PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

COMMENT ON TABLE activity_logs IS 'Journal d''audit partitionné par mois (accès et opérations sensibles).';


-- =============================================================================
--  3.19 CRÉATION DES PARTITIONS MENSUELLES
--
--      Fenêtre initiale : de juillet 2026 (premier mouvement du jeu de
--      démonstration) à mars 2027. Au-delà, la partition par défaut absorbe les
--      écritures et un appel à agriwater_create_month_partition() les bascule.
--
--      Note — `irrigations` n'est volontairement PAS partitionnée : elle est
--      référencée par water_movements.irrigation_id et par activities. Une clé
--      étrangère ne peut pointer que vers une clé primaire/unique, or sur une
--      table partitionnée PostgreSQL exige que cette clé contienne la clé de
--      partition. Partitionner `irrigations` obligerait donc à dupliquer la
--      date d'irrigation dans chaque ligne qui la référence, ou à supprimer
--      l'intégrité référentielle. On lui applique à la place un index BRIN sur
--      performed_at et des index composites couvrants (optimizations.sql), ce
--      qui apporte l'essentiel du gain sans toucher au modèle.
-- =============================================================================
SELECT agriwater_prepare_partitions_from(DATE '2026-07-01', DATE '2027-03-01');

-- Partitions de sécurité : absorbent toute écriture hors fenêtre
CREATE TABLE water_movements_default PARTITION OF water_movements DEFAULT;
CREATE TABLE activities_default      PARTITION OF activities      DEFAULT;
CREATE TABLE activity_logs_default   PARTITION OF activity_logs   DEFAULT;

COMMENT ON TABLE water_movements_default IS 'Filet de sécurité : mouvements hors des partitions mensuelles.';
COMMENT ON TABLE activities_default      IS 'Filet de sécurité : activités hors des partitions mensuelles.';
COMMENT ON TABLE activity_logs_default   IS 'Filet de sécurité : journal hors des partitions mensuelles.';


-- =============================================================================
--  3.22 CLÔTURE DE LA DÉPENDANCE CIRCULAIRE  Farm.manager_id -> users.id
-- =============================================================================
ALTER TABLE farms
    ADD CONSTRAINT farms_manager_id_fkey
    FOREIGN KEY (manager_id) REFERENCES users (id) ON DELETE SET NULL;


-- =============================================================================
--  4. TABLES TECHNIQUES LARAVEL
-- =============================================================================

CREATE TABLE public.password_reset_tokens (
    email      varchar(255) PRIMARY KEY,
    token      varchar(255) NOT NULL,
    created_at timestamptz  DEFAULT NULL
);

CREATE TABLE public.sessions (
    id            varchar(255) PRIMARY KEY,
    user_id       bigint,
    ip_address    varchar(45),
    user_agent    text,
    payload       text NOT NULL,
    last_activity integer NOT NULL
);

CREATE TABLE public.cache (
    key        varchar(255) PRIMARY KEY,
    value      text NOT NULL,
    expiration integer NOT NULL
);

CREATE TABLE public.cache_locks (
    key        varchar(255) PRIMARY KEY,
    owner      varchar(255) NOT NULL,
    expiration integer NOT NULL
);

CREATE TABLE public.jobs (
    id           bigserial PRIMARY KEY,
    queue        varchar(255) NOT NULL,
    payload      text NOT NULL,
    attempts     smallint NOT NULL,
    reserved_at  integer,
    available_at integer NOT NULL,
    created_at   integer NOT NULL
);

CREATE TABLE public.job_batches (
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

CREATE TABLE public.failed_jobs (
    id         bigserial PRIMARY KEY,
    uuid       varchar(255) NOT NULL,
    connection text NOT NULL,
    queue      text NOT NULL,
    payload    text NOT NULL,
    exception  text NOT NULL,
    failed_at  timestamptz DEFAULT now()
);

CREATE TABLE public.notifications (
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

CREATE INDEX sessions_last_activity_index  ON public.sessions (last_activity);
CREATE INDEX sessions_user_id_index        ON public.sessions (user_id);
CREATE INDEX jobs_queue_index              ON public.jobs (queue);
CREATE INDEX cache_expiration_index        ON public.cache (expiration);


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
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
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

CREATE TRIGGER trg_farms_manager_check
    BEFORE INSERT OR UPDATE OF manager_id ON farms
    FOR EACH ROW EXECUTE FUNCTION agriwater_check_farm_manager();

-- -----------------------------------------------------------------------------
-- 6.3 RM-01 — la parcelle d'une campagne appartient à la même exploitation
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agriwater_check_campaign_plot() RETURNS trigger
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
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

CREATE TRIGGER trg_campaigns_plot_check
    BEFORE INSERT OR UPDATE OF plot_id, farm_id ON campaigns
    FOR EACH ROW EXECUTE FUNCTION agriwater_check_campaign_plot();

-- -----------------------------------------------------------------------------
-- 6.4 RM-01 / RM-02 / RM-06 / RM-07 — cohérence d'une irrigation
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agriwater_check_irrigation_coherence() RETURNS trigger
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
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

CREATE TRIGGER trg_irrigations_coherence_check
    BEFORE INSERT OR UPDATE ON irrigations
    FOR EACH ROW EXECUTE FUNCTION agriwater_check_irrigation_coherence();

-- -----------------------------------------------------------------------------
-- 6.5 RM-10 — validation obligatoire du responsable au-delà d'un seuil
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agriwater_check_manager_validation() RETURNS trigger
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
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

CREATE TRIGGER trg_irrigations_manager_validation_check
    BEFORE INSERT OR UPDATE OF status, quantity, validated_by ON irrigations
    FOR EACH ROW EXECUTE FUNCTION agriwater_check_manager_validation();

-- -----------------------------------------------------------------------------
-- 6.6 RM-09 — toute variation du stock d'eau doit être tracée
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agriwater_assert_movement_trace() RETURNS trigger
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
BEGIN
    IF NEW.available_quantity IS DISTINCT FROM OLD.available_quantity
       AND NOT EXISTS (
            SELECT 1 FROM water_movements wm
            WHERE wm.water_source_id = NEW.id
              AND wm.quantity_before = OLD.available_quantity
              AND wm.quantity_after  = NEW.available_quantity
       ) THEN
        RAISE EXCEPTION
            'RM-09 : variation du stock de « % » (% -> %) sans mouvement d''eau traçable correspondant',
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
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
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
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
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
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
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

CREATE TRIGGER trg_revenues_harvest_check
    BEFORE INSERT OR UPDATE OF quantity, harvest_id ON revenues
    FOR EACH ROW EXECUTE FUNCTION agriwater_check_revenue_vs_harvest();

-- -----------------------------------------------------------------------------
-- 6.10 Cohérence inter-exploitation des autres entités cloisonnées (RM-01)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agriwater_check_same_farm() RETURNS trigger
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
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
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
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

CREATE TRIGGER trg_irrigations_log
    AFTER INSERT OR UPDATE OF status ON irrigations
    FOR EACH ROW EXECUTE FUNCTION agriwater_log_operation();

CREATE TRIGGER trg_water_sources_log
    AFTER INSERT OR UPDATE ON water_sources
    FOR EACH ROW EXECUTE FUNCTION agriwater_log_operation();


-- -----------------------------------------------------------------------------
--  6.12 RM-12 — toute variation du stock d'intrant doit être tracée
--      Symétrique de RM-09 appliqué à l'eau : le stock d'intrants ne peut pas
--      être modifié sans mouvement correspondant dans stock_movements.
--      Déclencheur différé : l'ordre des écritures dans la transaction est
--      libre, la vérification a lieu au COMMIT.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agriwater_assert_stock_trace() RETURNS trigger
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
BEGIN
    IF NEW.available_quantity IS DISTINCT FROM OLD.available_quantity
       AND NOT EXISTS (
            SELECT 1 FROM stock_movements sm
            WHERE sm.input_id = NEW.id
              AND sm.stock_before = OLD.available_quantity
              AND sm.stock_after  = NEW.available_quantity
       ) THEN
        RAISE EXCEPTION
            'RM-12 : variation du stock de « % » (% -> %) sans mouvement d''intrant traçable correspondant',
            NEW.name, OLD.available_quantity, NEW.available_quantity
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_inputs_stock_trace
    AFTER UPDATE OF available_quantity ON inputs
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION agriwater_assert_stock_trace();

-- -----------------------------------------------------------------------------
--  6.13 RM-08 appliqué aux intrants — alerte automatique au passage sous le
--      seuil critique (franchissement du seuil, pas simple passage en dessous)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agriwater_alert_critical_input() RETURNS trigger
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
BEGIN
    IF NEW.status = 'actif'
       AND NEW.available_quantity <= NEW.minimum_threshold
       AND OLD.available_quantity > OLD.minimum_threshold
       AND NOT EXISTS (
            SELECT 1 FROM alerts a
            WHERE a.input_id = NEW.id
              AND a.type = 'stock_critique'
              AND a.is_read = false
       ) THEN
        INSERT INTO alerts (farm_id, input_id, type, severity, title, message)
        VALUES (
            NEW.farm_id,
            NEW.id,
            'stock_critique',
            CASE WHEN NEW.available_quantity <= NEW.minimum_threshold / 2
                 THEN 'critique'::alert_severity
                 ELSE 'avertissement'::alert_severity END,
            format('Stock critique : %s', NEW.name),
            format('Le stock de « %s » est de %s %s pour un seuil minimal de %s %s. '
                   || 'Passez une commande avant d''engager la prochaine campagne.',
                   NEW.name, NEW.available_quantity, NEW.unit,
                   NEW.minimum_threshold, NEW.unit)
        );
    END IF;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_inputs_critical_alert
    AFTER UPDATE OF available_quantity ON inputs
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION agriwater_alert_critical_input();

-- -----------------------------------------------------------------------------
--  6.14 Cohérence planning / réalisation (CDC § 6.8 / § 6.9)
--      Passer une irrigation de statut « planifiee » à « realisee » clôture
--      automatiquement la planification correspondante : le taux de réalisation
--      (indicateur 4) reste donc toujours exact, sans travail manuel.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agriwater_sync_schedule_status() RETURNS trigger
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
DECLARE
    n integer;
BEGIN
    UPDATE irrigation_schedules s
       SET status      = 'realisee',
           updated_at  = now()
     WHERE s.campaign_id     = NEW.campaign_id
       AND s.plot_id         = NEW.plot_id
       AND s.water_source_id = NEW.water_source_id
       AND s.scheduled_date  = (NEW.performed_at AT TIME ZONE 'UTC')::date
       AND s.status          = 'planifiee';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN
        RAISE DEBUG 'Planification clôturée automatiquement (% ligne(s)) pour l''irrigation %', n, NEW.id;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_irrigations_sync_schedule
    AFTER UPDATE OF status ON irrigations
    FOR EACH ROW WHEN (NEW.status = 'realisee' AND OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION agriwater_sync_schedule_status();

-- -----------------------------------------------------------------------------
--  6.15 Libération d'une parcelle à la clôture de sa campagne
--      Une campagne terminée ou annulée ne doit pas laisser sa parcelle
--      verrouillée en « en_culture » : elle redevient disponible.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agriwater_release_plot_on_close() RETURNS trigger
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
BEGIN
    IF NEW.status IN ('terminee', 'annulee')
       AND OLD.status IS DISTINCT FROM NEW.status THEN
        UPDATE plots p
           SET status     = 'en_repos',
               updated_at = now()
         WHERE p.id = NEW.plot_id
           AND p.status = 'en_culture';
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_campaigns_release_plot
    AFTER UPDATE OF status ON campaigns
    FOR EACH ROW WHEN (NEW.status IN ('terminee', 'annulee'))
    EXECUTE FUNCTION agriwater_release_plot_on_close();


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
    c.id                AS campaign_id,
    p.code              AS plot_code,
    p.name              AS plot_name,
    p.status            AS plot_status,
    p.manual_priority,
    p.soil_moisture,
    agriwater_to_m2(p.area, p.area_unit) AS area_m2,
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
    END::priority_level AS proposed_priority
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


-- -----------------------------------------------------------------------------
--  7.8 Alertes actionnables — l'écran d'accueil de l'application
--      Classe par gravité puis ancienneté, et rattache l'objet concerné pour
--      éviter qu'un N+1 soit nécessaire côté API.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_alerts_recent AS
SELECT
    a.id,
    a.farm_id,
    f.name                                       AS farm_name,
    a.type,
    a.severity,
    (CASE a.severity WHEN 'critique' THEN 3 WHEN 'avertissement' THEN 2 ELSE 1 END)
                                                AS severity_rank,
    a.title,
    a.message,
    a.created_at,
    CURRENT_DATE - a.created_at::date             AS age_days,
    COALESCE(ws.name, i.name, c.code)              AS target_name,
    COALESCE(ws.id, i.id, c.id)                   AS target_id,
    CASE a.type
        WHEN 'eau_critique'     THEN concat('/sources/', ws.id)
        WHEN 'stock_critique'   THEN concat('/intrants/', i.id)
        WHEN 'campagne_a_risque' THEN concat('/campagnes/', c.id)
        ELSE '/'
    END                                           AS action_url
FROM alerts a
JOIN farms f ON f.id = a.farm_id
LEFT JOIN water_sources ws ON ws.id = a.water_source_id
LEFT JOIN inputs         i  ON i.id  = a.input_id
LEFT JOIN campaigns      c  ON c.id  = a.campaign_id
WHERE a.is_read = false;

-- -----------------------------------------------------------------------------
--  7.9 État consolidé d'une parcelle : campagne en cours, consommation,
--      score de priorité et último arrosage. Une seule requête pour l'écran
--      « mes parcelles ».
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_plot_status AS
SELECT
    p.id                AS plot_id,
    p.farm_id,
    f.name              AS farm_name,
    p.code              AS plot_code,
    p.name              AS plot_name,
    p.status            AS plot_status,
    p.manual_priority,
    p.soil_moisture,
    agriwater_to_m2(p.area, p.area_unit)                          AS area_m2,
    c.id                AS campaign_id,
    c.code              AS campaign_code,
    c.name              AS campaign_name,
    c.status            AS campaign_status,
    cr.name             AS crop_name,
    c.expected_end_date,
    (c.expected_end_date < CURRENT_DATE)                          AS is_overdue,
    pr.priority_score,
    pr.proposed_priority,
    COALESCE(wc.water_used, 0)                                   AS water_used,
    wc.last_irrigation_at,
    (CURRENT_DATE - wc.last_irrigation_at::date)                  AS days_since_irrigation,
    (SELECT count(*) FROM irrigation_schedules s
      WHERE s.plot_id = p.id
        AND s.status = 'planifiee'
        AND s.scheduled_date >= CURRENT_DATE)                    AS upcoming_irrigations
FROM plots p
JOIN farms f ON f.id = p.farm_id
LEFT JOIN campaigns c  ON c.plot_id = p.id AND c.status IN ('active', 'planifiee')
LEFT JOIN crops     cr ON cr.id = c.crop_id
LEFT JOIN v_irrigation_priority pr ON pr.plot_id = p.id
LEFT JOIN LATERAL (
    SELECT sum(i.quantity) AS water_used,
           max(i.performed_at) AS last_irrigation_at
      FROM irrigations i
     WHERE i.plot_id = p.id AND i.status IN ('validee', 'realisee')
) wc ON true;

-- -----------------------------------------------------------------------------
--  7.10 Planning opérationnel — le travail du jour et des jours suivants
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_planning_today AS
SELECT
    s.scheduled_date,
    s.id            AS schedule_id,
    s.farm_id,
    f.name          AS farm_name,
    p.code          AS plot_code,
    p.name          AS plot_name,
    c.code          AS campaign_code,
    cr.name         AS crop_name,
    ws.name         AS water_source_name,
    u.name          AS agent_name,
    s.agent_id,
    s.estimated_quantity,
    s.priority,
    s.status,
    s.comment,
    (SELECT count(*) FROM irrigations i
      WHERE i.plot_id = s.plot_id
        AND i.water_source_id = s.water_source_id
        AND i.performed_at::date = s.scheduled_date
        AND i.status IN ('validee', 'realisee'))                 AS already_done
FROM irrigation_schedules s
JOIN farms         f  ON f.id  = s.farm_id
JOIN plots         p  ON p.id  = s.plot_id
JOIN campaigns     c  ON c.id  = s.campaign_id
LEFT JOIN crops     cr ON cr.id = c.crop_id
JOIN water_sources ws ON ws.id = s.water_source_id
JOIN users         u  ON u.id  = s.agent_id
WHERE s.status IN ('planifiee', 'reportee');

-- -----------------------------------------------------------------------------
--  7.11 Synthèse stock d'intrants en temps réel
--      (la vue matérialisée mv_input_stock sert le calcul de couverture en
--       masse ; cette vue est la version temps réel pour une fiche intrant)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_input_stock_status AS
SELECT
    i.id                AS input_id,
    i.farm_id,
    f.name              AS farm_name,
    i.name,
    i.category,
    i.unit,
    i.available_quantity,
    i.minimum_threshold,
    round(i.available_quantity * i.unit_price, 2)                 AS stock_value,
    (i.available_quantity <= i.minimum_threshold)                 AS is_critical,
    (i.available_quantity = 0)                                    AS is_out_of_stock,
    (SELECT max(sm.movement_date) FROM stock_movements sm WHERE sm.input_id = i.id)
                                                                   AS last_movement_at,
    (SELECT sum(sm.quantity) FROM stock_movements sm
      WHERE sm.input_id = i.id AND sm.type IN ('sortie', 'consommation')
        AND sm.movement_date >= now() - interval '30 days')       AS consumed_30d,
    (SELECT count(*) FROM alerts a
      WHERE a.input_id = i.id AND a.type = 'stock_critique' AND a.is_read = false)
                                                                   AS open_alerts
FROM inputs i
JOIN farms f ON f.id = i.farm_id;

-- -----------------------------------------------------------------------------
--  7.12 Prévision d'eau par ressource (indicateur 3, version agrégée)
--      Horizon 7 jours : réserve disponible, consommation moyenne, besoins
--      planifiés et date de rupture estimée.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_water_forecast AS
SELECT
    ws.id                  AS water_source_id,
    ws.farm_id,
    f.name                 AS farm_name,
    ws.name                AS water_source_name,
    ws.unit,
    ws.available_quantity,
    ws.critical_threshold,
    GREATEST(ws.available_quantity - ws.critical_threshold, 0)       AS usable_quantity,
    COALESCE(cons.daily_need, 0)                                  AS daily_need,
    COALESCE(pl7.planned_7d, 0)                                   AS planned_7d,
    round(COALESCE(cons.daily_need, 0) * 7 + COALESCE(pl7.planned_7d, 0), 2)
                                                                    AS need_7d,
    CASE WHEN COALESCE(cons.daily_need, 0) > 0
         THEN round(GREATEST(ws.available_quantity - ws.critical_threshold, 0)
                    / COALESCE(cons.daily_need, 0), 1)
    END                                                           AS autonomy_days,
    -- Date estimée de rupture : à quel jour la réserve utile est consommée
    -- si l'on suit à la fois la consommation moyenne et le planning en cours.
    CASE
        WHEN COALESCE(cons.daily_need, 0) * 7 + COALESCE(pl7.planned_7d, 0) = 0
            THEN NULL
        WHEN GREATEST(ws.available_quantity - ws.critical_threshold, 0)
             >= COALESCE(cons.daily_need, 0) * 7 + COALESCE(pl7.planned_7d, 0)
            THEN NULL
        ELSE CURRENT_DATE + ceil(
                GREATEST(ws.available_quantity - ws.critical_threshold, 0)
                / ((COALESCE(cons.daily_need, 0) * 7 + COALESCE(pl7.planned_7d, 0)) / 7.0)
             )::int
    END                                                           AS projected_shortfall_date
FROM water_sources ws
JOIN farms f ON f.id = ws.farm_id
LEFT JOIN LATERAL (
    SELECT sum(i.quantity) / 30.0 AS daily_need
      FROM irrigations i
     WHERE i.water_source_id = ws.id
       AND i.status IN ('validee', 'realisee')
       AND i.performed_at >= now() - interval '30 days'
) cons ON true
LEFT JOIN LATERAL (
    SELECT sum(s.estimated_quantity) AS planned_7d
      FROM irrigation_schedules s
     WHERE s.water_source_id = ws.id
       AND s.status IN ('planifiee', 'reportee')
       AND s.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
) pl7 ON true
WHERE ws.status = 'active';


-- =============================================================================
--  8. LOGIQUE MÉTIER AVANCÉE — PROCÉDURES, PRÉVISIONNELS ET CONTRÔLES
--
--     Tout ce qui demande plusieurs écritures coordonnées, un calcul ou un
--     raisonnement métier est exécuté par la base, pas par l'application.
--     Gain : la règle s'applique à l'API, au back-office, aux imports CSV, aux
--     scripts de reprise — sans dupliquer le code, et elle ne peut pas être
--     contournée en écrivant directement dans les tables.
-- =============================================================================

-- -----------------------------------------------------------------------------
--  8.1 Conversion d'unité — l'eau est stockée en litres, mais peut être
--      saisie en m³ (un réservoir se remplit rarely par litres)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agriwater_to_litres(q numeric, u water_unit) RETURNS numeric
LANGUAGE sql IMMUTABLE
    SET search_path = agriwater, public AS $$
    SELECT CASE u WHEN 'm3' THEN q * 1000 ELSE q END;
$$;

CREATE OR REPLACE FUNCTION agriwater_from_litres(q numeric, u water_unit) RETURNS numeric
LANGUAGE sql IMMUTABLE
    SET search_path = agriwater, public AS $$
    SELECT CASE u WHEN 'm3' THEN q / 1000 ELSE q END;
$$;

COMMENT ON FUNCTION agriwater_to_litres(numeric, water_unit)   IS 'Normalise une quantité d''eau en litres.';
COMMENT ON FUNCTION agriwater_from_litres(numeric, water_unit) IS 'Convertit des litres dans l''unité de la ressource.';

-- -----------------------------------------------------------------------------
--  8.2 Enregistrer une irrigation — transaction métier complète (CDC § 8.1)
--
--      Regroupe dans UN SEUL appel les six écritures qu'une irrigation exige :
--        1. verrouillage de la ressource et lecture du stock (FOR UPDATE)
--        2. création de l'irrigation (déclenche les contrôles RM-01/02/03/06/07/10)
--        3. écriture du mouvement d'eau (RM-09)
--        4. décrément du stock
--        5. activité technique « irrigation » pour l'historique de la parcelle
--        6. journal d'audit rattaché à l'agent connecté
--
--      Si une seule des écritures échoue, tout est annulé : il est impossible
--      de consommer de l'eau sans trace, ni d'enregistrer une irrigation sans
--      avoir décrémenté le stock.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE agriwater_register_irrigation(
    p_farm_id         bigint,
    p_campaign_id     bigint,
    p_plot_id         bigint,
    p_water_source_id bigint,
    p_user_id         bigint,
    p_quantity        numeric,
    p_method          irrigation_method,
    p_unit            water_unit           DEFAULT 'L',
    p_validated_by    bigint               DEFAULT NULL,
    p_duration_minutes integer             DEFAULT NULL,
    p_performed_at    timestamptz          DEFAULT now(),
    p_observation     text                 DEFAULT NULL
)
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
DECLARE
    v_source       water_sources%ROWTYPE;
    v_irrigation   bigint;
    v_need_litres  numeric;
    v_delta        numeric;
    v_before       numeric;
    v_after        numeric;
BEGIN
    -- 0. identité applicative : l'audit des écritures suivantes portera cet agent
    PERFORM set_config('agriwater.user_id', p_user_id::text, true);

    -- 1. verrou pessimiste sur la ressource : deux agents ne peuvent pas
    --    consommer le même stock en parallèle
    SELECT * INTO v_source
      FROM water_sources
     WHERE id = p_water_source_id
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ressource en eau % introuvable', p_water_source_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    v_need_litres := agriwater_to_litres(p_quantity, p_unit);
    v_delta       := agriwater_from_litres(v_need_litres, v_source.unit);
    v_before      := v_source.available_quantity;
    v_after       := v_before - v_delta;

    -- 2. l'irrigation (les triggers RM-01/02/03/06/07/10 s'exécutent ici)
    INSERT INTO irrigations (
        farm_id, campaign_id, plot_id, water_source_id, performed_by, validated_by,
        performed_at, quantity, unit, duration_minutes, method, status, observation)
    VALUES (
        p_farm_id, p_campaign_id, p_plot_id, p_water_source_id, p_user_id, p_validated_by,
        p_performed_at, p_quantity, p_unit, p_duration_minutes, p_method, 'realisee', p_observation)
    RETURNING id INTO v_irrigation;

    -- 3. contrôle du solde avant d'écrire (RM-04)
    IF v_after < 0 THEN
        RAISE EXCEPTION
            'RM-04 : consommation impossible — « % » ne dispose que de % % et l''irrigation demande % %',
            v_source.name, v_before, v_source.unit, p_quantity, p_unit
            USING ERRCODE = 'check_violation';
    END IF;

    -- 4. mouvement d'eau traçable (RM-09)
    INSERT INTO water_movements (
        farm_id, water_source_id, campaign_id, irrigation_id, user_id,
        type, quantity, quantity_before, quantity_after, movement_date, note)
    VALUES (
        p_farm_id, p_water_source_id, p_campaign_id, v_irrigation, p_user_id,
        'consommation', v_delta, v_before, v_after, p_performed_at,
        format('Consommation irrigation #%s', v_irrigation));

    -- 5. décrément du stock
    UPDATE water_sources
       SET available_quantity = v_after
     WHERE id = p_water_source_id;

    -- 6. activité technique : la parcelle garde la trace de son arrosage
    INSERT INTO activities (farm_id, campaign_id, plot_id, user_id, type, activity_date, description)
    VALUES (p_farm_id, p_campaign_id, p_plot_id, p_user_id, 'irrigation',
            (p_performed_at AT TIME ZONE 'UTC')::date,
            format('Irrigation de %s %s (méthode : %s)', p_quantity, p_unit, p_method));

    RAISE NOTICE 'Irrigation #% enregistrée : % % sur « % » — nouveau stock % %',
                 v_irrigation, p_quantity, p_unit, v_source.name, v_after, v_source.unit;
END;
$$;

COMMENT ON PROCEDURE agriwater_register_irrigation(bigint, bigint, bigint, bigint, bigint,
    numeric, irrigation_method, water_unit, bigint, integer, timestamptz, text) IS
    'Enregistre une irrigation et ses six écritures associées dans une transaction unique (CDC § 8.1).';

-- -----------------------------------------------------------------------------
--  8.3 Planification automatique à partir du score de priorité (§ 6.10)
--
--      Parcourt les parcelles par score décroissant et crée une planification
--      pour demain tant que : la priorité est au moins « elevee », qu'aucune
--      irrigation n'est déjà planifiée sur l'horizon, et qu'une ressource de
--      l'exploitation dispose d'une réserve utilisable suffisante. L'agent
--      retenu est celui qui a le moins de tâches ce jour-là.
--
--      Retourne les planifications créées.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agriwater_plan_irrigations(
    p_farm_id        bigint         DEFAULT NULL,
    p_horizon_days   integer        DEFAULT 7,
    p_min_priority   priority_level DEFAULT 'elevee',
    p_agent_id       bigint         DEFAULT NULL
)
RETURNS TABLE (
    schedule_id       bigint,
    farm_name         varchar,
    plot_code         varchar,
    scheduled_date    date,
    estimated_quantity numeric,
    water_source_name varchar,
    agent_name        varchar,
    priority          priority_level
)
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
DECLARE
    r          record;
    v_qty      numeric;
    v_source   bigint;
    v_agent    bigint;
    v_campaign bigint;
    v_sched_id bigint;
    v_date     date := CURRENT_DATE + 1;
    v_wanted   integer;
BEGIN
    v_wanted := agriwater_priority_weight(p_min_priority);

    FOR r IN
        SELECT pr.plot_id, pr.farm_id, pr.campaign_id, pr.proposed_priority,
               pr.water_requirement, pr.area_m2, pr.priority_score
          FROM v_irrigation_priority pr
         WHERE (p_farm_id IS NULL OR pr.farm_id = p_farm_id)
           AND agriwater_priority_weight(pr.proposed_priority) >= v_wanted
           AND NOT EXISTS (
                SELECT 1 FROM irrigation_schedules s
                 WHERE s.plot_id = pr.plot_id
                   AND s.status IN ('planifiee', 'reportee')
                   AND s.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + p_horizon_days)
         ORDER BY pr.priority_score DESC
    LOOP
        -- Besoin en eau de la culture (L/m²) × surface (m²) : même formule que
        -- le module de priorité, pour que la planification reste cohérente
        -- avec ce que l'agent voit à l'écran.
        v_qty := round(GREATEST(r.water_requirement, 0) * r.area_m2, 2);
        CONTINUE WHEN v_qty IS NULL OR v_qty <= 0;

        -- Ressource la mieux approvisionnée au-dessus de son seuil critique
        SELECT ws.id INTO v_source
          FROM water_sources ws
         WHERE ws.farm_id = r.farm_id
           AND ws.status = 'active'
           AND (ws.available_quantity - ws.critical_threshold) >= v_qty
         ORDER BY (ws.available_quantity - ws.critical_threshold) DESC
         LIMIT 1;
        CONTINUE WHEN v_source IS NULL;      -- réserve insuffisante : on n'engage rien

        -- Agent le moins chargé sur la date cible
        v_agent := COALESCE(p_agent_id, (
            SELECT u.id
              FROM users u
              JOIN roles ro ON ro.id = u.role_id
             WHERE u.farm_id = r.farm_id
               AND u.is_active
               AND ro.name = 'agent'
             ORDER BY (SELECT count(*) FROM irrigation_schedules s2
                        WHERE s2.agent_id = u.id
                          AND s2.scheduled_date = v_date
                          AND s2.status IN ('planifiee', 'reportee')) ASC,
                      u.id
             LIMIT 1));
        CONTINUE WHEN v_agent IS NULL;

        INSERT INTO irrigation_schedules (
            farm_id, campaign_id, plot_id, water_source_id, agent_id,
            scheduled_date, estimated_quantity, priority, status, comment)
        VALUES (
            r.farm_id, r.campaign_id, r.plot_id, v_source, v_agent,
            v_date, v_qty, r.proposed_priority, 'planifiee',
            format('Planification automatique — score de priorité %s', r.priority_score))
        RETURNING id INTO v_sched_id;

        schedule_id        := v_sched_id;
        farm_name          := (SELECT f.name FROM farms f WHERE f.id = r.farm_id);
        plot_code          := (SELECT p.code FROM plots p WHERE p.id = r.plot_id);
        scheduled_date     := v_date;
        estimated_quantity := v_qty;
        water_source_name  := (SELECT ws.name FROM water_sources ws WHERE ws.id = v_source);
        agent_name         := (SELECT u.name FROM users u WHERE u.id = v_agent);
        priority           := r.proposed_priority;
        RETURN NEXT;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION agriwater_plan_irrigations(bigint, integer, priority_level, bigint) IS
    'Planifie automatiquement les irrigations prioritaires du lendemain, sous réserve de réserve en eau suffisante.';

-- -----------------------------------------------------------------------------
--  8.4 Prévisionnel de réserve (indicateur 3, projeté sur l'horizon)
--      Combine la consommation moyenne des 30 derniers jours et les besoins
--      déjà planifiés pour projeter le niveau jour par jour, et signale le
--      premier jour de rupture.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agriwater_reserve_forecast(p_water_source_id bigint, p_days integer DEFAULT 30)
RETURNS TABLE (
    day                 date,
    available_quantity  numeric,
    daily_need          numeric,
    planned_demand      numeric,
    projected_quantity  numeric,
    below_threshold     boolean
)
LANGUAGE sql STABLE
    SET search_path = agriwater, public AS $$
    WITH ws AS (
        SELECT w.id, w.available_quantity, w.critical_threshold
          FROM water_sources w
         WHERE w.id = p_water_source_id AND w.status = 'active'
    ),
    days AS (
        SELECT generate_series(CURRENT_DATE, CURRENT_DATE + p_days, interval '1 day')::date AS day
    ),
    base AS (
        SELECT COALESCE((
                   SELECT sum(i.quantity) / 30.0
                     FROM irrigations i
                    WHERE i.water_source_id = p_water_source_id
                      AND i.status IN ('validee', 'realisee')
                      AND i.performed_at >= now() - interval '30 days'
               ), 0) AS daily_need
    ),
    planned AS (
        SELECT s.scheduled_date AS day, sum(s.estimated_quantity) AS demand
          FROM irrigation_schedules s
          JOIN water_sources w ON w.id = s.water_source_id
         WHERE s.water_source_id = p_water_source_id
           AND s.status IN ('planifiee', 'reportee')
           AND s.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + p_days
         GROUP BY 1
    ),
    proj AS (
        SELECT d.day,
               b.daily_need,
               COALESCE(pl.demand, 0) AS planned_demand,
               w.available_quantity - b.daily_need
                   - COALESCE(sum(COALESCE(pl.demand, 0)) OVER (
                       ORDER BY d.day ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0)
                   AS projected
          FROM days d
          CROSS JOIN base b
          CROSS JOIN ws  w
          LEFT JOIN planned pl ON pl.day = d.day
    )
    SELECT pj.day,
           ws.available_quantity,
           round(pj.daily_need, 2)                 AS daily_need,
           pj.planned_demand,
           round(GREATEST(pj.projected, 0), 2)      AS projected_quantity,
           (GREATEST(pj.projected, 0) < ws.critical_threshold) AS below_threshold
      FROM proj pj CROSS JOIN ws
     ORDER BY pj.day;
$$;

COMMENT ON FUNCTION agriwater_reserve_forecast(bigint, integer) IS
    'Projection jour par jour du niveau d''une réserve : consommation moyenne + planifications en cours.';

-- -----------------------------------------------------------------------------
--  8.5 Marge d'une campagne, coût de l'eau inclus (CDC § 9.3)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agriwater_campaign_margin(p_campaign_id bigint)
RETURNS TABLE (
    campaign_code   varchar,
    total_expenses  numeric,
    total_revenues  numeric,
    gross_margin    numeric,
    margin_rate_pct numeric,
    water_used      numeric,
    harvested       numeric
)
LANGUAGE sql STABLE
    SET search_path = agriwater, public AS $$
    SELECT c.code,
           COALESCE((SELECT sum(e.amount) FROM expenses e WHERE e.campaign_id = c.id), 0),
           COALESCE((SELECT sum(r.amount) FROM revenues r WHERE r.campaign_id = c.id), 0),
           COALESCE((SELECT sum(r.amount) FROM revenues r WHERE r.campaign_id = c.id), 0)
             - COALESCE((SELECT sum(e.amount) FROM expenses e WHERE e.campaign_id = c.id), 0)
             - COALESCE((SELECT sum(ac.cost) FROM activities ac WHERE ac.campaign_id = c.id), 0),
           round(
               CASE WHEN COALESCE((SELECT sum(r.amount) FROM revenues r WHERE r.campaign_id = c.id), 0) > 0
                    THEN 100.0 * (
                        COALESCE((SELECT sum(r.amount) FROM revenues r WHERE r.campaign_id = c.id), 0)
                        - COALESCE((SELECT sum(e.amount) FROM expenses e WHERE e.campaign_id = c.id), 0)
                        - COALESCE((SELECT sum(ac.cost) FROM activities ac WHERE ac.campaign_id = c.id), 0)
                    ) / (SELECT sum(r.amount) FROM revenues r WHERE r.campaign_id = c.id)
               END, 2),
           COALESCE((SELECT sum(i.quantity) FROM irrigations i
                      WHERE i.campaign_id = c.id AND i.status IN ('validee', 'realisee')), 0),
           COALESCE((SELECT sum(h.quantity) FROM harvests h WHERE h.campaign_id = c.id), 0)
      FROM campaigns c
     WHERE c.id = p_campaign_id;
$$;

COMMENT ON FUNCTION agriwater_campaign_margin(bigint) IS
    'Marge brute, taux de marge, eau consommée et récolte d''une campagne (coûts d''activité inclus).';

-- -----------------------------------------------------------------------------
--  8.6 Clôture de campagne : statut, date réelle et libération de la parcelle
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE agriwater_close_campaign(p_campaign_id bigint, p_actual_end_date date DEFAULT CURRENT_DATE)
LANGUAGE plpgsql
    SET search_path = agriwater, public AS $$
DECLARE
    v_code varchar;
BEGIN
    UPDATE campaigns
       SET status          = 'terminee',
           actual_end_date = COALESCE(actual_end_date, p_actual_end_date),
           updated_at      = now()
     WHERE id = p_campaign_id
       AND status NOT IN ('terminee', 'annulee')
    RETURNING code INTO v_code;

    IF v_code IS NULL THEN
        RAISE NOTICE 'Campagne % déjà close ou inexistante — aucune action', p_campaign_id;
        RETURN;
    END IF;

    RAISE NOTICE 'Campagne % close au % (parcelle libérée par trg_campaigns_release_plot)',
                 v_code, p_actual_end_date;
END;
$$;

-- -----------------------------------------------------------------------------
--  8.7 Contrôle d'audit des ressources en eau
--      Renvoie les anomalies constatables sur le journal : c'est le « audit
--      » que l'on ne peut pas faire depuis l'application une fois l'écriture
--      terminée (et que la base est la seule à pouvoir certifier).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agriwater_water_audit()
RETURNS TABLE (
    anomaly           text,
    water_source_id   bigint,
    water_source_name varchar,
    detail            text
)
LANGUAGE sql STABLE
    SET search_path = agriwater, public AS $$
    -- 1. le stock affiché ne correspond pas au dernier mouvement tracé
    SELECT 'stock_non_reconcilie', w.id, w.name,
           format('stock = % % alors que le dernier mouvement donne % %',
                  w.available_quantity, w.unit, lm.quantity_after, w.unit)
      FROM water_sources w
      LEFT JOIN LATERAL (
            SELECT wm.quantity_after FROM water_movements wm
             WHERE wm.water_source_id = w.id
             ORDER BY wm.movement_date DESC, wm.id DESC LIMIT 1) lm ON true
     WHERE lm.quantity_after IS NOT NULL
       AND lm.quantity_after <> w.available_quantity
    UNION ALL
    -- 2. ressource sous son seuil critique sans alerte ouverte
    SELECT 'seuil_sans_alerte', w.id, w.name,
           format('%s %s sous le seuil de %s %s, aucune alerte non lue',
                  w.available_quantity, w.unit, w.critical_threshold, w.unit)
      FROM water_sources w
     WHERE w.status = 'active'
       AND w.available_quantity <= w.critical_threshold
       AND NOT EXISTS (SELECT 1 FROM alerts a
                        WHERE a.water_source_id = w.id
                          AND a.type = 'eau_critique'
                          AND a.is_read = false)
    UNION ALL
    -- 3. irrigation consommatrice sans mouvement d'eau (violation RM-09)
    SELECT 'irrigation_sans_mouvement', ws.id, ws.name,
           format('irrigation #%s du %s sans mouvement d''eau',
                  i.id, i.performed_at::date)
      FROM irrigations i
      JOIN water_sources ws ON ws.id = i.water_source_id
     WHERE i.status IN ('validee', 'realisee')
       AND NOT EXISTS (SELECT 1 FROM water_movements wm WHERE wm.irrigation_id = i.id)
    UNION ALL
    -- 4. mouvement sans irrigation rattachée alors que le type l'exige
    SELECT 'mouvement_non_trace', ws.id, ws.name,
           format('mouvement #%s de type %s sans irrigation', wm.id, wm.type)
      FROM water_movements wm
      JOIN water_sources ws ON ws.id = wm.water_source_id
     WHERE wm.type = 'consommation'
       AND wm.irrigation_id IS NULL
     ORDER BY 1, 3;
$$;

COMMENT ON FUNCTION agriwater_water_audit() IS
    'Contrôle d''intégrité du journal d''eau : réconciliation des stocks, seuils sans alerte, mouvements orphelins.';

-- -----------------------------------------------------------------------------
--  8.8 Périmètre d'accès d'un utilisateur (soutien à RM-01 côté application)
--      Renvoie null pour farm_id quand l'utilisateur est administrateur global :
--      c'est le seul cas où l'accès transverse est légitime.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION agriwater_user_scope(p_user_id bigint)
RETURNS TABLE (
    user_id    bigint,
    user_name  varchar,
    role       varchar,
    farm_id    bigint,
    farm_name  varchar,
    can_cross  boolean,
    permissions jsonb
)
LANGUAGE sql STABLE
    SET search_path = agriwater, public AS $$
    SELECT u.id, u.name, r.name, u.farm_id, f.name,
           (u.farm_id IS NULL AND r.name = 'administrateur'),
           r.permissions
      FROM users u
      JOIN roles r   ON r.id = u.role_id
      LEFT JOIN farms f ON f.id = u.farm_id
     WHERE u.id = p_user_id;
$$;

COMMENT ON FUNCTION agriwater_user_scope(bigint) IS
    'Périmètre d''accès d''un utilisateur : exploitation rattachée, rôle, droits et droit de lecture transverse.';


-- =============================================================================
--  9. DOCUMENTATION DES COLONNES
--
--      Toute colonne de la base est décrite ici. Objectif : que la structure
--      soit lisible sans ouvrir le CDC ni le code : \d agriwater.irrigations
--      ou un introspection d'ORM restitue la documentation métier.
-- =============================================================================

COMMENT ON COLUMN agriwater.activities.id IS 'Identifiant technique (bigserial).';
COMMENT ON COLUMN agriwater.activities.farm_id IS 'Exploitation concernée.';
COMMENT ON COLUMN agriwater.activities.campaign_id IS 'Campagne concernée, si l''activité s''y rattache.';
COMMENT ON COLUMN agriwater.activities.plot_id IS 'Parcelle concernée.';
COMMENT ON COLUMN agriwater.activities.user_id IS 'Agent ayant réalisé l''activité.';
COMMENT ON COLUMN agriwater.activities.type IS 'Nature de l''activité : semis, fertilisation, récolte, irrigation, désherbage…';
COMMENT ON COLUMN agriwater.activities.activity_date IS 'Date de réalisation. Colonne de partitionnement mensuelle.';
COMMENT ON COLUMN agriwater.activities.description IS 'Description détaillée de l''activité.';
COMMENT ON COLUMN agriwater.activities.cost IS 'Coût imputé à la campagne (main-d''œuvre, intrants…).';
COMMENT ON COLUMN agriwater.activities.created_at IS 'Horodatage de création.';
COMMENT ON COLUMN agriwater.activities.updated_at IS 'Horodatage de dernière modification (maintenu par le déclencheur trg_*_updated_at).';
COMMENT ON COLUMN agriwater.activity_logs.id IS 'Identifiant technique (bigserial).';
COMMENT ON COLUMN agriwater.activity_logs.farm_id IS 'Exploitation concernée, NULL pour une opération globale (rôles, comptes).';
COMMENT ON COLUMN agriwater.activity_logs.user_id IS 'Auteur de l''opération, déduit du paramètre de session agriwater.user_id.';
COMMENT ON COLUMN agriwater.activity_logs.action IS 'Opération journalisée (insert, update, validate…).';
COMMENT ON COLUMN agriwater.activity_logs.entity_type IS 'Table concernée.';
COMMENT ON COLUMN agriwater.activity_logs.entity_id IS 'Ligne concernée.';
COMMENT ON COLUMN agriwater.activity_logs.description IS 'Description lisible de l''opération.';
COMMENT ON COLUMN agriwater.activity_logs.ip_address IS 'Adresse IP de l''appelant.';
COMMENT ON COLUMN agriwater.activity_logs.user_agent IS 'User-Agent de l''appelant.';
COMMENT ON COLUMN agriwater.activity_logs.created_at IS 'Horodatage de l''événement. Colonne de partitionnement mensuelle.';
COMMENT ON COLUMN agriwater.alerts.id IS 'Identifiant technique (bigserial).';
COMMENT ON COLUMN agriwater.alerts.farm_id IS 'Exploitation destinataire de l''alerte.';
COMMENT ON COLUMN agriwater.alerts.water_source_id IS 'Ressource concernée. CHECK : exactement un des troisForeign_key est renseigné.';
COMMENT ON COLUMN agriwater.alerts.input_id IS 'Intrant concerné.';
COMMENT ON COLUMN agriwater.alerts.campaign_id IS 'Campagne concernée.';
COMMENT ON COLUMN agriwater.alerts.type IS 'eau_critique, stock_critique, campagne_a_risque ou systeme.';
COMMENT ON COLUMN agriwater.alerts.severity IS 'Gravité : info, avertissement ou critique.';
COMMENT ON COLUMN agriwater.alerts.title IS 'Titre court affiché dans la liste des alertes.';
COMMENT ON COLUMN agriwater.alerts.message IS 'Détail de l''alerte et action recommandée.';
COMMENT ON COLUMN agriwater.alerts.is_read IS 'Alerte traitée par un utilisateur.';
COMMENT ON COLUMN agriwater.alerts.read_at IS 'Date de traitement (cohérent avec is_read par CHECK).';
COMMENT ON COLUMN agriwater.alerts.created_at IS 'Horodatage de création.';
COMMENT ON COLUMN agriwater.campaigns.id IS 'Identifiant technique (bigserial).';
COMMENT ON COLUMN agriwater.campaigns.farm_id IS 'Exploitation qui porte la campagne.';
COMMENT ON COLUMN agriwater.campaigns.plot_id IS 'Parcelle cultivée. Doit appartenir à la même exploitation (RM-01).';
COMMENT ON COLUMN agriwater.campaigns.crop_id IS 'Culture produite pendant la campagne.';
COMMENT ON COLUMN agriwater.campaigns.manager_id IS 'Responsable qui encadre la campagne.';
COMMENT ON COLUMN agriwater.campaigns.code IS 'Code de campagne, unique par exploitation (ex. CAMP-TOM-2026-001).';
COMMENT ON COLUMN agriwater.campaigns.name IS 'Nom lisible de la campagne.';
COMMENT ON COLUMN agriwater.campaigns.start_date IS 'Date de début prévue.';
COMMENT ON COLUMN agriwater.campaigns.expected_end_date IS 'Date de fin prévue. Une campagne active qui la dépasse est à risque.';
COMMENT ON COLUMN agriwater.campaigns.actual_end_date IS 'Date de fin réelle, renseignée à la clôture (agriwater_close_campaign).';
COMMENT ON COLUMN agriwater.campaigns.area IS 'Superficie de la campagne, en m².';
COMMENT ON COLUMN agriwater.campaigns.status IS 'Avancement : planifiee, active, suspendue, terminee ou annulee. Une campagne close n''accepte plus d''opération (RM-11).';
COMMENT ON COLUMN agriwater.campaigns.notes IS 'Notes libres sur la campagne.';
COMMENT ON COLUMN agriwater.campaigns.created_at IS 'Horodatage de création.';
COMMENT ON COLUMN agriwater.campaigns.updated_at IS 'Horodatage de dernière modification (maintenu par le déclencheur trg_*_updated_at).';
COMMENT ON COLUMN agriwater.crops.id IS 'Identifiant technique (bigserial).';
COMMENT ON COLUMN agriwater.crops.name IS 'Nom de la culture.';
COMMENT ON COLUMN agriwater.crops.category IS 'Catégorie (maraîchère, céréalière, fruitière…).';
COMMENT ON COLUMN agriwater.crops.estimated_duration_days IS 'Durée de cycle estimée, en jours.';
COMMENT ON COLUMN agriwater.crops.water_requirement IS 'Besoin en eau de la culture, en litres par m² et par cycle. Alimente le score de priorité § 6.10.';
COMMENT ON COLUMN agriwater.crops.production_unit IS 'Unité de production de la culture (kg, t, unité…).';
COMMENT ON COLUMN agriwater.crops.status IS 'Culture active ou archivée.';
COMMENT ON COLUMN agriwater.crops.created_at IS 'Horodatage de création.';
COMMENT ON COLUMN agriwater.crops.updated_at IS 'Horodatage de dernière modification (maintenu par le déclencheur trg_*_updated_at).';
COMMENT ON COLUMN agriwater.expenses.id IS 'Identifiant technique (bigserial).';
COMMENT ON COLUMN agriwater.expenses.farm_id IS 'Exploitation qui engage la dépense.';
COMMENT ON COLUMN agriwater.expenses.campaign_id IS 'Campagne imputée. Interdite si la campagne est close (RM-11).';
COMMENT ON COLUMN agriwater.expenses.user_id IS 'Auteur de la saisie.';
COMMENT ON COLUMN agriwater.expenses.expense_date IS 'Date de la dépense.';
COMMENT ON COLUMN agriwater.expenses.amount IS 'Montant en Ariary, strictement positif.';
COMMENT ON COLUMN agriwater.expenses.category IS 'Nature de la dépense : semences, engrais, carburant, main-d''œuvre, achat d''eau…';
COMMENT ON COLUMN agriwater.expenses.description IS 'Libellé de la dépense.';
COMMENT ON COLUMN agriwater.expenses.receipt_path IS 'Chemin du justificatif (photo de reçu).';
COMMENT ON COLUMN agriwater.expenses.created_at IS 'Horodatage de création.';
COMMENT ON COLUMN agriwater.expenses.updated_at IS 'Horodatage de dernière modification (maintenu par le déclencheur trg_*_updated_at).';
COMMENT ON COLUMN agriwater.farms.id IS 'Identifiant technique (bigserial).';
COMMENT ON COLUMN agriwater.farms.name IS 'Nom de l''exploitation.';
COMMENT ON COLUMN agriwater.farms.location IS 'Localisation administrative (région, district, commune).';
COMMENT ON COLUMN agriwater.farms.type IS 'Type d''activité (maraîchage, riziculture, mixte…).';
COMMENT ON COLUMN agriwater.farms.total_area IS 'Superficie totale déclarée, en m².';
COMMENT ON COLUMN agriwater.farms.manager_id IS 'Responsable de l''exploitation. Doit appartenir à la ferme ou être administrateur global (RM-01).';
COMMENT ON COLUMN agriwater.farms.status IS 'État de l''exploitation : active, suspendue ou inactive.';
COMMENT ON COLUMN agriwater.farms.created_at IS 'Horodatage de création.';
COMMENT ON COLUMN agriwater.farms.updated_at IS 'Horodatage de dernière modification (maintenu par le déclencheur trg_*_updated_at).';
COMMENT ON COLUMN agriwater.harvests.id IS 'Identifiant technique (bigserial).';
COMMENT ON COLUMN agriwater.harvests.farm_id IS 'Exploitation qui a récolté.';
COMMENT ON COLUMN agriwater.harvests.campaign_id IS 'Campagne concernée.';
COMMENT ON COLUMN agriwater.harvests.plot_id IS 'Parcelle récoltée.';
COMMENT ON COLUMN agriwater.harvests.user_id IS 'Agent ayant effectué la récolte.';
COMMENT ON COLUMN agriwater.harvests.product IS 'Produit récolté.';
COMMENT ON COLUMN agriwater.harvests.harvest_date IS 'Date de la récolte.';
COMMENT ON COLUMN agriwater.harvests.quantity IS 'Quantité récoltée, strictement positive. Elle plafonne la quantité vendue (RM-13).';
COMMENT ON COLUMN agriwater.harvests.unit IS 'Unité de la quantité (kg, t…).';
COMMENT ON COLUMN agriwater.harvests.quality IS 'Qualité commerciale (extra, première catégorie…).';
COMMENT ON COLUMN agriwater.harvests.loss_quantity IS 'Pertes au champ ou au stockage, incluses dans la quantité récoltée.';
COMMENT ON COLUMN agriwater.harvests.observation IS 'Remarque sur la récolte.';
COMMENT ON COLUMN agriwater.harvests.created_at IS 'Horodatage de création.';
COMMENT ON COLUMN agriwater.harvests.updated_at IS 'Horodatage de dernière modification (maintenu par le déclencheur trg_*_updated_at).';
COMMENT ON COLUMN agriwater.inputs.id IS 'Identifiant technique (bigserial).';
COMMENT ON COLUMN agriwater.inputs.farm_id IS 'Exploitation propriétaire du stock.';
COMMENT ON COLUMN agriwater.inputs.name IS 'Désignation de l''intrant.';
COMMENT ON COLUMN agriwater.inputs.category IS 'Famille d''intrant : semence, engrais, carburant, tuyau, pièce de pompe…';
COMMENT ON COLUMN agriwater.inputs.unit IS 'Unité de conditionnement (kg, L, m, pièce…).';
COMMENT ON COLUMN agriwater.inputs.minimum_threshold IS 'Stock d''alerte. En dessous, une alerte « stock critique » est levée (RM-08) et le stock ne peut plus être modifié sans mouvement tracé (RM-12).';
COMMENT ON COLUMN agriwater.inputs.available_quantity IS 'Stock disponible. Ne peut jamais être négatif (RM-12).';
COMMENT ON COLUMN agriwater.inputs.unit_price IS 'Prix unitaire d''achat.';
COMMENT ON COLUMN agriwater.inputs.supplier IS 'Fournisseur habituel.';
COMMENT ON COLUMN agriwater.inputs.status IS 'Intrant actif ou archivé.';
COMMENT ON COLUMN agriwater.inputs.created_at IS 'Horodatage de création.';
COMMENT ON COLUMN agriwater.inputs.updated_at IS 'Horodatage de dernière modification (maintenu par le déclencheur trg_*_updated_at).';
COMMENT ON COLUMN agriwater.irrigation_schedules.id IS 'Identifiant technique (bigserial).';
COMMENT ON COLUMN agriwater.irrigation_schedules.farm_id IS 'Exploitation concernée.';
COMMENT ON COLUMN agriwater.irrigation_schedules.campaign_id IS 'Campagne à laquelle l''irrigation est rattachée.';
COMMENT ON COLUMN agriwater.irrigation_schedules.plot_id IS 'Parcelle à irriguer.';
COMMENT ON COLUMN agriwater.irrigation_schedules.water_source_id IS 'Ressource prévue. N''a aucun effet sur le stock tant que l''irrigation n''est pas réalisée.';
COMMENT ON COLUMN agriwater.irrigation_schedules.agent_id IS 'Agent chargé de l''exécution.';
COMMENT ON COLUMN agriwater.irrigation_schedules.scheduled_date IS 'Date prévue de l''irrigation.';
COMMENT ON COLUMN agriwater.irrigation_schedules.scheduled_time IS 'Heure prévue.';
COMMENT ON COLUMN agriwater.irrigation_schedules.estimated_quantity IS 'Volume estimé, dans l''unité de la ressource.';
COMMENT ON COLUMN agriwater.irrigation_schedules.priority IS 'Priorité de la tâche selon le module personnel § 6.10.';
COMMENT ON COLUMN agriwater.irrigation_schedules.status IS 'planifiee, realisee (clôturée automatiquement par trg_irrigations_sync_schedule), reportee ou annulee.';
COMMENT ON COLUMN agriwater.irrigation_schedules.comment IS 'Précisions sur la tâche.';
COMMENT ON COLUMN agriwater.irrigation_schedules.created_at IS 'Horodatage de création.';
COMMENT ON COLUMN agriwater.irrigation_schedules.updated_at IS 'Horodatage de dernière modification (maintenu par le déclencheur trg_*_updated_at).';
COMMENT ON COLUMN agriwater.irrigations.id IS 'Identifiant technique (bigserial).';
COMMENT ON COLUMN agriwater.irrigations.farm_id IS 'Exploitation qui a réalisé l''irrigation.';
COMMENT ON COLUMN agriwater.irrigations.campaign_id IS 'Campagne irriguée.';
COMMENT ON COLUMN agriwater.irrigations.plot_id IS 'Parcelle irriguée. Doit correspondre à la parcelle de la campagne (RM-07).';
COMMENT ON COLUMN agriwater.irrigations.water_source_id IS 'Ressource consommée.';
COMMENT ON COLUMN agriwater.irrigations.performed_by IS 'Agent ayant exécuté l''irrigation.';
COMMENT ON COLUMN agriwater.irrigations.validated_by IS 'Responsable ayant validé. Obligatoire au-delà du seuil de 2 000 L (RM-10).';
COMMENT ON COLUMN agriwater.irrigations.scheduled_at IS 'Date et heure initialement planifiées.';
COMMENT ON COLUMN agriwater.irrigations.performed_at IS 'Date et heure réelles de l''exécution. Colonne de partitionnement de la vue de consommation.';
COMMENT ON COLUMN agriwater.irrigations.quantity IS 'Volume consommé, strictement positif (RM-03), dans l''unité ci-dessous.';
COMMENT ON COLUMN agriwater.irrigations.unit IS 'Unité du volume saisi : L ou m3.';
COMMENT ON COLUMN agriwater.irrigations.duration_minutes IS 'Durée de l''irrigation, en minutes.';
COMMENT ON COLUMN agriwater.irrigations.method IS 'Mode d''arrosage employé.';
COMMENT ON COLUMN agriwater.irrigations.status IS ' brouillon, planifiee, en_attente_validation, validee, realisee, annulee ou refusee. Seules « validee » et « realisee » consomment réellement de l''eau.';
COMMENT ON COLUMN agriwater.irrigations.observation IS 'Remarque terrain.';
COMMENT ON COLUMN agriwater.irrigations.created_at IS 'Horodatage de création.';
COMMENT ON COLUMN agriwater.irrigations.updated_at IS 'Horodatage de dernière modification (maintenu par le déclencheur trg_*_updated_at).';
COMMENT ON COLUMN agriwater.plots.id IS 'Identifiant technique (bigserial).';
COMMENT ON COLUMN agriwater.plots.farm_id IS 'Exploitation propriétaire (racine du cloisonnement RM-01).';
COMMENT ON COLUMN agriwater.plots.code IS 'Code de la parcelle, unique au sein de l''exploitation (ex. P-A01).';
COMMENT ON COLUMN agriwater.plots.name IS 'Nom lisible de la parcelle.';
COMMENT ON COLUMN agriwater.plots.area IS 'Superficie déclarée, dans l''unité ci-dessous.';
COMMENT ON COLUMN agriwater.plots.area_unit IS 'Unité de la superficie : m2 ou ha (normalisée par agriwater_to_m2).';
COMMENT ON COLUMN agriwater.plots.location IS 'Localisation de la parcelle au sein de l''exploitation.';
COMMENT ON COLUMN agriwater.plots.soil_type IS 'Type de sol (argileux, sableux, limoneux…).';
COMMENT ON COLUMN agriwater.plots.status IS 'État de la parcelle : disponible, en_culture, en_repos ou indisponible.';
COMMENT ON COLUMN agriwater.plots.manual_priority IS 'Priorité fixée à la main par le responsable. Module personnel § 6.10.';
COMMENT ON COLUMN agriwater.plots.soil_moisture IS 'Humidité du sol mesurée, en pourcentage (0-100). Module personnel § 6.10.';
COMMENT ON COLUMN agriwater.plots.created_at IS 'Horodatage de création.';
COMMENT ON COLUMN agriwater.plots.updated_at IS 'Horodatage de dernière modification (maintenu par le déclencheur trg_*_updated_at).';
COMMENT ON COLUMN agriwater.revenues.id IS 'Identifiant technique (bigserial).';
COMMENT ON COLUMN agriwater.revenues.farm_id IS 'Exploitation qui encaisse la recette.';
COMMENT ON COLUMN agriwater.revenues.campaign_id IS 'Campagne imputée.';
COMMENT ON COLUMN agriwater.revenues.harvest_id IS 'Récolte vendue. Si renseignée, la quantité est plafonnée par la récolte (RM-13).';
COMMENT ON COLUMN agriwater.revenues.user_id IS 'Auteur de la saisie.';
COMMENT ON COLUMN agriwater.revenues.revenue_date IS 'Date d''encaissement.';
COMMENT ON COLUMN agriwater.revenues.amount IS 'Montant en Ariary, strictement positif.';
COMMENT ON COLUMN agriwater.revenues.product IS 'Produit vendu.';
COMMENT ON COLUMN agriwater.revenues.quantity IS 'Quantité vendue, dans l''unité ci-dessous.';
COMMENT ON COLUMN agriwater.revenues.unit IS 'Unité de vente (kg, t…).';
COMMENT ON COLUMN agriwater.revenues.client IS 'Client acheteur.';
COMMENT ON COLUMN agriwater.revenues.comment IS 'Précisions sur la vente.';
COMMENT ON COLUMN agriwater.revenues.created_at IS 'Horodatage de création.';
COMMENT ON COLUMN agriwater.revenues.updated_at IS 'Horodatage de dernière modification (maintenu par le déclencheur trg_*_updated_at).';
COMMENT ON COLUMN agriwater.roles.id IS 'Identifiant technique (bigserial).';
COMMENT ON COLUMN agriwater.roles.name IS 'Nom du rôle : administrateur, responsable ou agent (contraint par CHECK).';
COMMENT ON COLUMN agriwater.roles.description IS 'Description lisible du rôle.';
COMMENT ON COLUMN agriwater.roles.permissions IS 'Droits accordés, au format JSONB (ex. ["plots.*","water.*"]). Index GIN pour le filtrage.';
COMMENT ON COLUMN agriwater.roles.created_at IS 'Horodatage de création.';
COMMENT ON COLUMN agriwater.roles.updated_at IS 'Horodatage de dernière modification (maintenu par le déclencheur trg_*_updated_at).';
COMMENT ON COLUMN agriwater.stock_movements.id IS 'Identifiant technique (bigserial).';
COMMENT ON COLUMN agriwater.stock_movements.farm_id IS 'Exploitation concernée.';
COMMENT ON COLUMN agriwater.stock_movements.input_id IS 'Intrant dont le stock varie.';
COMMENT ON COLUMN agriwater.stock_movements.campaign_id IS 'Campagne imputée, le cas échéant.';
COMMENT ON COLUMN agriwater.stock_movements.user_id IS 'Auteur du mouvement.';
COMMENT ON COLUMN agriwater.stock_movements.type IS 'stock_initial, entree, sortie, consommation ou ajustement.';
COMMENT ON COLUMN agriwater.stock_movements.quantity IS 'Quantité déplacée, valeur absolue.';
COMMENT ON COLUMN agriwater.stock_movements.stock_before IS 'Stock avant le mouvement.';
COMMENT ON COLUMN agriwater.stock_movements.stock_after IS 'Stock après le mouvement.';
COMMENT ON COLUMN agriwater.stock_movements.movement_date IS 'Date et heure du mouvement.';
COMMENT ON COLUMN agriwater.stock_movements.note IS 'Motif du mouvement.';
COMMENT ON COLUMN agriwater.stock_movements.created_at IS 'Horodatage de création.';
COMMENT ON COLUMN agriwater.users.id IS 'Identifiant technique (bigserial).';
COMMENT ON COLUMN agriwater.users.farm_id IS 'Exploitation de rattachement. NULL = administrateur global (seul cas autorisé à lire plusieurs fermes).';
COMMENT ON COLUMN agriwater.users.role_id IS 'Rôle applicatif (administrateur, responsable, agent).';
COMMENT ON COLUMN agriwater.users.name IS 'Nom et prénom de l''utilisateur.';
COMMENT ON COLUMN agriwater.users.email IS 'Adresse e-mail, identifiant de connexion (unique).';
COMMENT ON COLUMN agriwater.users.password IS 'Empreinte du mot de passe (bcrypt). Jamais stockée en clair.';
COMMENT ON COLUMN agriwater.users.email_verified_at IS 'Date de validation de l''adresse e-mail.';
COMMENT ON COLUMN agriwater.users.phone IS 'Numéro de téléphone.';
COMMENT ON COLUMN agriwater.users.is_active IS 'Compte actif. Un compte désactivé ne peut plus se connecter.';
COMMENT ON COLUMN agriwater.users.last_login_at IS 'Dernière connexion réussie.';
COMMENT ON COLUMN agriwater.users.remember_token IS 'Jeton du cookie « se souvenir de moi ».';
COMMENT ON COLUMN agriwater.users.created_at IS 'Horodatage de création.';
COMMENT ON COLUMN agriwater.users.updated_at IS 'Horodatage de dernière modification (maintenu par le déclencheur trg_*_updated_at).';
COMMENT ON COLUMN agriwater.water_movements.id IS 'Identifiant technique (bigserial).';
COMMENT ON COLUMN agriwater.water_movements.farm_id IS 'Exploitation concernée.';
COMMENT ON COLUMN agriwater.water_movements.water_source_id IS 'Ressource dont le stock varie.';
COMMENT ON COLUMN agriwater.water_movements.campaign_id IS 'Campagne imputée, si le mouvement en découle.';
COMMENT ON COLUMN agriwater.water_movements.irrigation_id IS 'Irrigation à l''origine du mouvement de consommation.';
COMMENT ON COLUMN agriwater.water_movements.user_id IS 'Auteur du mouvement.';
COMMENT ON COLUMN agriwater.water_movements.type IS 'Nature du mouvement : stock_initial, remplissage, consommation, perte, ajustement, correction, vidange ou transfert.';
COMMENT ON COLUMN agriwater.water_movements.quantity IS 'Volume déplacé, valeur absolue, dans l''unité de la ressource.';
COMMENT ON COLUMN agriwater.water_movements.quantity_before IS 'Stock avant le mouvement.';
COMMENT ON COLUMN agriwater.water_movements.quantity_after IS 'Stock après le mouvement. La cohérence des trois valeurs est garantie par CHECK.';
COMMENT ON COLUMN agriwater.water_movements.movement_date IS 'Date et heure du mouvement. Colonne de partitionnement mensuelle.';
COMMENT ON COLUMN agriwater.water_movements.note IS 'Motif du mouvement.';
COMMENT ON COLUMN agriwater.water_movements.created_at IS 'Horodatage de création.';
COMMENT ON COLUMN agriwater.water_sources.id IS 'Identifiant technique (bigserial).';
COMMENT ON COLUMN agriwater.water_sources.farm_id IS 'Exploitation propriétaire de la ressource.';
COMMENT ON COLUMN agriwater.water_sources.name IS 'Nom de la ressource (Puits Est, Réservoir principal…).';
COMMENT ON COLUMN agriwater.water_sources.type IS 'Nature : puits, citerne, bassin, reservoir, canal, riviere ou reserve_pluie.';
COMMENT ON COLUMN agriwater.water_sources.capacity IS 'Capacité maximale, dans l''unité ci-dessous.';
COMMENT ON COLUMN agriwater.water_sources.available_quantity IS 'Stock actuellement disponible. Ne peut jamais être négatif (RM-04) ni dépasser la capacité (RM-05). Toute variation doit être justifiée par un mouvement tracé (RM-09).';
COMMENT ON COLUMN agriwater.water_sources.unit IS 'Unité de mesure du volume : L ou m3.';
COMMENT ON COLUMN agriwater.water_sources.critical_threshold IS 'Seuil sous lequel une alerte « eau critique » est levée automatiquement (RM-08).';
COMMENT ON COLUMN agriwater.water_sources.location IS 'Localisation de la ressource.';
COMMENT ON COLUMN agriwater.water_sources.status IS 'operative (active), en maintenance ou inutilisable (RM-02).';
COMMENT ON COLUMN agriwater.water_sources.created_at IS 'Horodatage de création.';
COMMENT ON COLUMN agriwater.water_sources.updated_at IS 'Horodatage de dernière modification (maintenu par le déclencheur trg_*_updated_at).';

COMMIT;
