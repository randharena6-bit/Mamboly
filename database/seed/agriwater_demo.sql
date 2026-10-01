-- =============================================================================
--  AgriWater — Jeu de données de démonstration (CDC.md § 19)
--
--  Cibles : 3 exploitations, 10 utilisateurs, 12 parcelles, 8 cultures,
--           15 campagnes, 8 ressources en eau, 40 irrigations, 50+ mouvements
--           d'eau, 30 activités, 20 dépenses, 15 recettes, alertes critiques.
--
--  Comptes de démonstration (mot de passe : « password »)
--    admin@agriwater.test                 administrateur
--    responsable.tsinjo@agriwater.test    responsable exploitation A
--    agent.tsinjo@agriwater.test          agent exploitation A
--    responsable.vokatra@agriwater.test   responsable exploitation B
--    agent.vokatra@agriwater.test         agent exploitation B
--
--  Application : psql -U agriwater -d agriwater -f database/seed/agriwater_demo.sql
--  Prérequis   : database/schema.sql déjà appliqué
-- =============================================================================

BEGIN;

SET client_min_messages TO WARNING;

-- =============================================================================
--  1. RÔLES
-- =============================================================================
INSERT INTO roles (id, name, description, permissions) VALUES
    (1, 'administrateur', 'Gère l''application, les comptes, les rôles et les journaux',
        '["farms.*","users.*","roles.*","logs.view","alerts.*"]'::jsonb),
    (2, 'responsable',    'Responsable opérationnel d''une exploitation',
        '["plots.*","crops.*","campaigns.*","water.*","stocks.*","finance.*","dashboard.view","alerts.*"]'::jsonb),
    (3, 'agent',          'Agent agricole de terrain',
        '["plots.view","campaigns.view","irrigations.create","activities.create","observations.create"]'::jsonb);

-- =============================================================================
--  2. EXPLOITATIONS
-- =============================================================================
INSERT INTO farms (id, name, location, type, total_area, status) VALUES
    (1, 'Tsinjo Maitso',   'Ambohidratrimo, Analamanga', 'Maraîchage',               2.50, 'active'),
    (2, 'Vokatra Soa',     'Ankazobe, Itasy',             'Maraîchage',               3.20, 'active'),
    (3, 'Tanimbary Miray', 'Betafo, Vakinankaratra',      'Riziculture et maraîchage', 5.75, 'active');

-- =============================================================================
--  3. UTILISATEURS  (mot de passe bcrypt de « password »)
-- =============================================================================
INSERT INTO users (id, farm_id, role_id, name, email, password, phone, is_active, email_verified_at) VALUES
    (1,  NULL, 1, 'Admin AgriWater',        'admin@agriwater.test',               '$2y$10$F2hYEZsIkicUzPdSidnOK.GYUk4./duwr.Yt6QsPfMAiQ9aa35ySa', '0340000001', true, now()),
    (2,  1,    2, 'Rakoto Jean',            'responsable.tsinjo@agriwater.test',  '$2y$10$F2hYEZsIkicUzPdSidnOK.GYUk4./duwr.Yt6QsPfMAiQ9aa35ySa', '0340000002', true, now()),
    (3,  1,    3, 'Ranaivo Paul',           'agent.tsinjo@agriwater.test',        '$2y$10$F2hYEZsIkicUzPdSidnOK.GYUk4./duwr.Yt6QsPfMAiQ9aa35ySa', '0340000003', true, now()),
    (4,  1,    3, 'Randria Hery',           'agent2.tsinjo@agriwater.test',       '$2y$10$F2hYEZsIkicUzPdSidnOK.GYUk4./duwr.Yt6QsPfMAiQ9aa35ySa', '0340000004', true, now()),
    (5,  2,    2, 'Rasoanaivo Marie',       'responsable.vokatra@agriwater.test', '$2y$10$F2hYEZsIkicUzPdSidnOK.GYUk4./duwr.Yt6QsPfMAiQ9aa35ySa', '0340000005', true, now()),
    (6,  2,    3, 'Rabe Tiana',             'agent.vokatra@agriwater.test',       '$2y$10$F2hYEZsIkicUzPdSidnOK.GYUk4./duwr.Yt6QsPfMAiQ9aa35ySa', '0340000006', true, now()),
    (7,  2,    3, 'Rakotondrabe Solo',      'agent2.vokatra@agriwater.test',      '$2y$10$F2hYEZsIkicUzPdSidnOK.GYUk4./duwr.Yt6QsPfMAiQ9aa35ySa', '0340000007', true, now()),
    (8,  3,    2, 'Andriamalala Naivo',     'responsable.miray@agriwater.test',   '$2y$10$F2hYEZsIkicUzPdSidnOK.GYUk4./duwr.Yt6QsPfMAiQ9aa35ySa', '0340000008', true, now()),
    (9,  3,    3, 'Razafy Lova',            'agent.miray@agriwater.test',         '$2y$10$F2hYEZsIkicUzPdSidnOK.GYUk4./duwr.Yt6QsPfMAiQ9aa35ySa', '0340000009', true, now()),
    (10, 3,    3, 'Ratsimba Faly',          'agent2.miray@agriwater.test',        '$2y$10$F2hYEZsIkicUzPdSidnOK.GYUk4./duwr.Yt6QsPfMAiQ9aa35ySa', '0340000010', true, now());

UPDATE farms SET manager_id = 2 WHERE id = 1;
UPDATE farms SET manager_id = 5 WHERE id = 2;
UPDATE farms SET manager_id = 8 WHERE id = 3;

-- =============================================================================
--  4. CULTURES
-- =============================================================================
INSERT INTO crops (id, name, category, estimated_duration_days, water_requirement, production_unit, status) VALUES
    (1, 'Tomate',         'Fruit',    120, 18.00, 'kg',   'actif'),
    (2, 'Carotte',        'Racine',    95, 12.00, 'kg',   'actif'),
    (3, 'Haricot vert',   'Légumineuse', 75, 15.00, 'kg', 'actif'),
    (4, 'Laitue',         'Feuille',   55, 22.00, 'pièce', 'actif'),
    (5, 'Pomme de terre', 'Tubercule', 110, 14.00, 'kg',  'actif'),
    (6, 'Chou',           'Feuille',   90, 20.00, 'pièce', 'actif'),
    (7, 'Concombre',      'Fruit',     70, 25.00, 'kg',   'actif'),
    (8, 'Poivron',        'Fruit',    100, 17.00, 'kg',   'inactif');

-- =============================================================================
--  5. PARCELLES
-- =============================================================================
INSERT INTO plots (id, farm_id, code, name, area, area_unit, location, soil_type, status, manual_priority, soil_moisture) VALUES
    (1,  1, 'P-A01', 'Parcelle Tomates Nord',   800.00, 'm2', 'Zone nord',  'limono-argileux', 'en_culture',  'critique', 25.0),
    (2,  1, 'P-A02', 'Parcelle Haricots Est',   650.00, 'm2', 'Zone est',   'limoneux',        'en_culture',  'normale',  45.0),
    (3,  1, 'P-A03', 'Parcelle Laitues',        400.00, 'm2', 'Zone sud',   'sableux',         'disponible',  'faible',   60.0),
    (4,  1, 'P-A04', 'Parcelle Carottes',       0.12,   'ha', 'Zone ouest', 'limono-sableux',  'en_culture',  'elevee',   35.0),
    (5,  2, 'P-B01', 'Parcelle Choux',          900.00, 'm2', 'Colline est','limoneux',        'en_culture',  'normale',  50.0),
    (6,  2, 'P-B02', 'Parcelle Concombres',     0.08,   'ha', 'Bas-fond',   'argileux',        'en_culture',  'elevee',   30.0),
    (7,  2, 'P-B03', 'Parcelle Pommes de terre',700.00, 'm2', 'Plateau',    'limono-argileux', 'en_culture',  'normale',  40.0),
    (8,  2, 'P-B04', 'Parcelle Laitues Est',    450.00, 'm2', 'Zone est',   'sableux',         'en_repos',    'faible',   55.0),
    (9,  3, 'P-C01', 'Parcelle Riz Nord',       0.50,   'ha', 'Bas-fond nord','argileux',      'en_culture',  'elevee',   38.0),
    (10, 3, 'P-C02', 'Parcelle Tomates Sud',    0.15,   'ha', 'Bas-fond sud','limono-argileux', 'en_culture', 'critique', 20.0),
    (11, 3, 'P-C03', 'Parcelle Haricots',       600.00, 'm2', 'Flanc ouest','limoneux',        'en_culture',  'normale',  48.0),
    (12, 3, 'P-C04', 'Parcelle Choux Miray',    750.00, 'm2', 'Flanc est', 'limono-sableux',  'disponible',  'faible',   62.0);

-- =============================================================================
--  6. RESSOURCES EN EAU
-- =============================================================================
INSERT INTO water_sources (id, farm_id, name, type, capacity, available_quantity, unit, critical_threshold, location, status) VALUES
    (1, 1, 'Réservoir principal',   'reservoir',     20000.00, 18000.00, 'L', 4000.00, 'Centre exploitation', 'active'),
    (2, 1, 'Citerne Nord',          'citerne',       15000.00, 14000.00, 'L', 3000.00, 'Zone nord',           'active'),
    (3, 1, 'Bassin Sud',            'bassin',        12000.00, 11000.00, 'L', 2500.00, 'Zone sud',            'active'),
    (4, 2, 'Puits Est',             'puits',         30000.00, 28000.00, 'L', 5000.00, 'Colline est',         'active'),
    (5, 2, 'Réservoir Vokatra',     'reservoir',     25000.00, 24000.00, 'L', 4000.00, 'Centre exploitation', 'active'),
    (6, 2, 'Réserve eau de pluie',  'reserve_pluie', 18000.00, 17000.00, 'L', 3500.00, 'Toiture hangar',      'active'),
    (7, 3, 'Canal Miray',           'canal',         50000.00, 48000.00, 'L', 8000.00, 'Canal amont',         'active'),
    (8, 3, 'Citerne Miray',         'citerne',       22000.00, 21000.00, 'L', 4000.00, 'Bas-fond sud',        'maintenance');

-- Mouvements initiaux (stock initial) — traçabilité RM-09
INSERT INTO water_movements (farm_id, water_source_id, user_id, type, quantity, quantity_before, quantity_after, movement_date, note)
SELECT ws.farm_id, ws.id, f.manager_id, 'stock_initial', ws.available_quantity, 0, ws.available_quantity,
       now() - interval '90 days', 'Stock initial de démonstration'
FROM water_sources ws JOIN farms f ON f.id = ws.farm_id;

-- =============================================================================
--  7. CAMPAGNES
-- =============================================================================
INSERT INTO campaigns (id, farm_id, plot_id, crop_id, manager_id, code, name, start_date, expected_end_date, actual_end_date, area, status, notes) VALUES
    (1,  1, 1,  1, 2, 'CAMP-TOM-2026-001', 'Tomate saison des pluies 2026',   CURRENT_DATE - 45, CURRENT_DATE + 75, NULL, 800.00, 'active',    'Campagne principale'),
    (2,  1, 2,  3, 2, 'CAMP-HAR-2026-001', 'Haricot vert novembre 2026',      CURRENT_DATE - 30, CURRENT_DATE + 45, NULL, 650.00, 'active',    NULL),
    (3,  1, 4,  2, 2, 'CAMP-CAR-2026-001', 'Carotte saison sèche 2026',       CURRENT_DATE - 20, CURRENT_DATE + 75, NULL, 1200.00,'active',    NULL),
    (4,  1, 3,  4, 2, 'CAMP-LAI-2026-001', 'Laitue octobre 2026',             CURRENT_DATE - 70, CURRENT_DATE - 15, CURRENT_DATE - 18, 400.00, 'terminee', 'Récolte terminée'),
    (5,  2, 5,  6, 5, 'CAMP-CHO-2026-001', 'Chou saison des pluies 2026',     CURRENT_DATE - 40, CURRENT_DATE + 50, NULL, 900.00, 'active',    NULL),
    (6,  2, 6,  7, 5, 'CAMP-CON-2026-001', 'Concombre irrigué 2026',          CURRENT_DATE - 25, CURRENT_DATE + 45, NULL, 800.00, 'active',    'Irrigation goutte-à-goutte'),
    (7,  2, 7,  5, 5, 'CAMP-PDT-2026-001', 'Pomme de terre 2026',             CURRENT_DATE - 60, CURRENT_DATE + 50, NULL, 700.00, 'active',    NULL),
    (8,  2, 8,  4, 5, 'CAMP-LAI-2026-002', 'Laitue Est décembre 2026',        CURRENT_DATE + 5,  CURRENT_DATE + 60, NULL, 450.00, 'planifiee', 'En préparation'),
    (9,  3, 9,  1, 8, 'CAMP-RIZ-2026-001', 'Riz de contre-saison 2026',       CURRENT_DATE - 55, CURRENT_DATE + 65, NULL, 5000.00,'active',    'Riziculture'),
    (10, 3, 10, 1, 8, 'CAMP-TOM-2026-002', 'Tomate bas-fond sud 2026',        CURRENT_DATE - 35, CURRENT_DATE + 85, NULL, 1500.00,'active',    NULL),
    (11, 3, 11, 3, 8, 'CAMP-HAR-2026-002', 'Haricot Miray 2026',              CURRENT_DATE - 28, CURRENT_DATE + 47, NULL, 600.00, 'active',    NULL),
    (12, 3, 12, 6, 8, 'CAMP-CHO-2026-002', 'Chou Miray 2026',                 CURRENT_DATE - 15, CURRENT_DATE + 75, NULL, 750.00, 'active',    NULL),
    (13, 1, 1,  1, 2, 'CAMP-TOM-2025-003', 'Tomate saison sèche 2025',        CURRENT_DATE - 220,CURRENT_DATE - 100, CURRENT_DATE - 105, 800.00,'terminee', 'Campagne archivée'),
    (14, 2, 5,  6, 5, 'CAMP-CHO-2025-002', 'Chou 2025',                       CURRENT_DATE - 210,CURRENT_DATE - 90,  CURRENT_DATE - 92, 900.00, 'terminee', NULL),
    (15, 3, 9,  1, 8, 'CAMP-RIZ-2025-001', 'Riz saison 2025',                 CURRENT_DATE - 200,CURRENT_DATE - 80,  CURRENT_DATE - 85, 5000.00,'terminee', NULL);

-- Mouvements complémentaires (remplissage, ajout manuel, perte) — respectent RM-09
DO $$
DECLARE
    op        record;
    v_before  numeric;
    v_after   numeric;
BEGIN
    FOR op IN
        SELECT * FROM (VALUES
            (1::bigint, 1::bigint, 2::bigint, 'remplissage'::water_movement_type,  1500::numeric,  1500::numeric, 'Remplissage par pompe'),
            (2,         4,         5,        'ajout_manuel',                          800,            800,          'Ajout manuel de la réserve'),
            (3,         7,         8,        'perte',                                 250,           -250,          'Fuite sur le canal')
        ) AS t(farm_id, water_source_id, user_id, type, qty, delta, note)
    LOOP
        SELECT available_quantity INTO v_before FROM water_sources WHERE id = op.water_source_id;
        v_after := v_before + op.delta;

        INSERT INTO water_movements (farm_id, water_source_id, user_id, type, quantity,
                                     quantity_before, quantity_after, movement_date, note)
        VALUES (op.farm_id, op.water_source_id, op.user_id, op.type, op.qty,
                v_before, v_after, now() - interval '15 days', op.note);

        UPDATE water_sources SET available_quantity = v_after WHERE id = op.water_source_id;
    END LOOP;
END;
$$;

-- =============================================================================
--  8. IRRIGATIONS + MOUVEMENTS D'EAU + MISE À JOUR DES STOCKS
--     Reproduction exacte de la transaction du CDC § 8.1
-- =============================================================================
CREATE TEMP TABLE seed_src   (farm_id bigint, id bigint, rn int, cnt int) ON COMMIT DROP;
CREATE TEMP TABLE seed_camp  (farm_id bigint, id bigint, plot_id bigint, rn int, cnt int) ON COMMIT DROP;
CREATE TEMP TABLE seed_agent (farm_id bigint, id bigint, rn int, cnt int) ON COMMIT DROP;
CREATE TEMP TABLE seed_farm  (farm_id bigint, camp_cnt int, src_cnt int, agent_cnt int, manager_id bigint) ON COMMIT DROP;
CREATE TEMP TABLE seed_bal   (water_source_id bigint PRIMARY KEY, qty numeric) ON COMMIT DROP;

INSERT INTO seed_src
SELECT farm_id, id, row_number() OVER (PARTITION BY farm_id ORDER BY id)::int,
       count(*) OVER (PARTITION BY farm_id)::int
FROM water_sources WHERE status = 'active';

INSERT INTO seed_camp
SELECT farm_id, id, plot_id, row_number() OVER (PARTITION BY farm_id ORDER BY id)::int,
       count(*) OVER (PARTITION BY farm_id)::int
FROM campaigns WHERE status = 'active';

INSERT INTO seed_agent
SELECT farm_id, id, row_number() OVER (PARTITION BY farm_id ORDER BY id)::int,
       count(*) OVER (PARTITION BY farm_id)::int
FROM users WHERE role_id = 3 AND is_active;

INSERT INTO seed_farm
SELECT sf.farm_id, sc.cnt, ss.cnt, sa.cnt, f.manager_id
FROM (SELECT DISTINCT farm_id FROM seed_src) sf
JOIN (SELECT farm_id, cnt FROM seed_camp  WHERE rn = 1) sc ON sc.farm_id = sf.farm_id
JOIN (SELECT farm_id, cnt FROM seed_src   WHERE rn = 1) ss ON ss.farm_id = sf.farm_id
JOIN (SELECT farm_id, cnt FROM seed_agent WHERE rn = 1) sa ON sa.farm_id = sf.farm_id
JOIN farms f ON f.id = sf.farm_id;

INSERT INTO seed_bal SELECT id, available_quantity FROM water_sources;

CREATE TEMP TABLE seed_irr ON COMMIT DROP AS
SELECT
    g.i,
    c.farm_id,
    c.id                                   AS campaign_id,
    c.plot_id,
    s.id                                   AS water_source_id,
    a.id                                   AS agent_id,
    sf.manager_id,
    CASE WHEN g.i % 13 = 5
         THEN 2400 + (g.i % 5) * 100
         ELSE 300 + ((g.i * 97) % 1000) END AS quantity,
    now() - ((41 - g.i) || ' days')::interval
          - (((g.i * 7) % 12) || ' hours')::interval AS performed_at,
    (ARRAY['arrosage_manuel','goutte_a_goutte','aspersion','gravitaire','tuyau','pompe'])
        [((g.i - 1) % 6) + 1]::irrigation_method AS method
FROM generate_series(1, 40) g(i)
JOIN LATERAL (SELECT ((g.i - 1) % 3) + 1 AS farm_id) gd ON true
JOIN seed_farm  sf ON sf.farm_id = gd.farm_id
JOIN seed_camp  c  ON c.farm_id = gd.farm_id AND c.rn = ((g.i - 1) % sf.camp_cnt) + 1
JOIN seed_src   s  ON s.farm_id = gd.farm_id AND s.rn = ((g.i - 1) % sf.src_cnt) + 1
JOIN seed_agent a  ON a.farm_id = gd.farm_id AND a.rn = ((g.i - 1) % sf.agent_cnt) + 1;

DO $$
DECLARE
    r         record;
    v_before  numeric;
    v_after   numeric;
    v_irr_id  bigint;
    v_count   int := 0;
BEGIN
    FOR r IN SELECT * FROM seed_irr ORDER BY performed_at, i LOOP
        SELECT qty INTO v_before FROM seed_bal WHERE water_source_id = r.water_source_id;

        -- on ne descend jamais sous zéro (RM-04) : plafonnement
        v_after := GREATEST(v_before - r.quantity, 0);
        IF v_after = v_before THEN
            CONTINUE;                       -- ressource épuisée, on n'irrigue pas
        END IF;

        INSERT INTO irrigations (
            farm_id, campaign_id, plot_id, water_source_id, performed_by, validated_by,
            scheduled_at, performed_at, quantity, unit, duration_minutes, method, status, observation
        ) VALUES (
            r.farm_id, r.campaign_id, r.plot_id, r.water_source_id, r.agent_id,
            CASE WHEN r.quantity > 2000 THEN r.manager_id ELSE NULL END,
            r.performed_at - interval '2 hours',
            r.performed_at, v_before - v_after, 'L',
            30 + (r.i * 13) % 150,
            r.method, 'realisee',
            'Irrigation de démonstration n°' || r.i
        ) RETURNING id INTO v_irr_id;

        INSERT INTO water_movements (
            farm_id, water_source_id, campaign_id, irrigation_id, user_id,
            type, quantity, quantity_before, quantity_after, movement_date, note
        ) VALUES (
            r.farm_id, r.water_source_id, r.campaign_id, v_irr_id, r.agent_id,
            'consommation', v_before - v_after, v_before, v_after, r.performed_at,
            'Consommation irrigation n°' || r.i
        );

        UPDATE water_sources SET available_quantity = v_after WHERE id = r.water_source_id;
        UPDATE seed_bal SET qty = v_after WHERE water_source_id = r.water_source_id;

        -- activité technique générée automatiquement (CDC § 8.1)
        INSERT INTO activities (farm_id, campaign_id, plot_id, user_id, type, activity_date, description)
        VALUES (r.farm_id, r.campaign_id, r.plot_id, r.agent_id, 'irrigation',
                r.performed_at::date, 'Irrigation automatique n°' || r.i);

        v_count := v_count + 1;
    END LOOP;

    RAISE NOTICE 'Irrigations enregistrées : %', v_count;
END;
$$;

-- Vidange volontaire qui fait passer une réserve sous son seuil critique (RM-08)
DO $$
DECLARE
    v_before numeric;
    v_after  numeric;
BEGIN
    SELECT available_quantity INTO v_before FROM water_sources WHERE id = 3;
    v_after := 1800;                        -- seuil critique = 2500

    INSERT INTO water_movements (farm_id, water_source_id, user_id, type, quantity,
                                 quantity_before, quantity_after, movement_date, note)
    VALUES (1, 3, 2, 'vidange', v_before - v_after, v_before, v_after,
            now() - interval '2 days', 'Vidange de maintenance');

    UPDATE water_sources SET available_quantity = v_after WHERE id = 3;
END;
$$;

-- =============================================================================
--  9. PLANIFICATION DES IRRIGATIONS
-- =============================================================================
INSERT INTO irrigation_schedules (farm_id, campaign_id, plot_id, water_source_id, agent_id,
                                  scheduled_date, scheduled_time, estimated_quantity, priority, status, comment)
SELECT
    c.farm_id, c.id, c.plot_id,
    (SELECT ws.id FROM water_sources ws
      WHERE ws.farm_id = c.farm_id AND ws.status = 'active'
      ORDER BY ws.id LIMIT 1),
    (SELECT u.id FROM users u
      WHERE u.farm_id = c.farm_id AND u.role_id = 3
      ORDER BY u.id LIMIT 1),
    CURRENT_DATE + ((row_number() OVER (ORDER BY c.id))::int - 3),
    ('06:00'::time + ((row_number() OVER (ORDER BY c.id) % 4) || ' hours')::interval),
    400 + (c.id * 137) % 900,
    (ARRAY['faible','normale','elevee','critique'])[(c.id % 4) + 1]::priority_level,
    (ARRAY['planifiee','planifiee','realisee','planifiee'])[(c.id % 4) + 1]::schedule_status,
    'Planning de démonstration'
FROM campaigns c
WHERE c.status = 'active'
LIMIT 15;

-- =============================================================================
-- 10. INTRANTS ET MOUVEMENTS DE STOCK
-- =============================================================================
INSERT INTO inputs (id, farm_id, name, category, unit, minimum_threshold, available_quantity, unit_price, supplier, status) VALUES
    (1,  1, 'Semences tomate',        'semence',               'kg',  5.00,  18.00, 45000.00, 'Agri-Sème',      'actif'),
    (2,  1, 'Engrais NPK',            'engrais',               'kg', 20.00,  85.00, 3500.00,  'Fertil Madagascar','actif'),
    (3,  1, 'Traitement fongicide',   'produit_phytosanitaire','L',   3.00,   0.50, 28000.00, 'PhytoProtect',   'actif'),
    (4,  2, 'Carburant gasoil',       'carburant',             'L',  50.00, 120.00, 6200.00,  'Station Total',  'actif'),
    (5,  2, 'Tuyaux goutte-à-goutte', 'tuyau',                 'm',  30.00,  95.00, 1800.00,  'IrriTech',       'actif'),
    (6,  2, 'Compost organique',      'compost',               'kg', 50.00, 240.00, 800.00,   'Ferme locale',   'actif'),
    (7,  3, 'Semences riz',           'semence',               'kg', 25.00,  75.00, 12000.00, 'Rizière Plus',   'actif'),
    (8,  3, 'Pièces de pompe',        'piece_pompe',           'pièce',1.00,  4.00, 85000.00, 'MotoPompe',      'actif'),
    (9,  3, 'Traitement eau',         'traitement_eau',        'L',   2.00,   8.00, 15000.00, 'AquaPure',       'actif');

INSERT INTO stock_movements (farm_id, input_id, campaign_id, user_id, type, quantity, stock_before, stock_after, movement_date, note)
SELECT i.farm_id, i.id, NULL, f.manager_id, 'stock_initial', i.available_quantity, 0, i.available_quantity,
       now() - interval '80 days', 'Stock initial'
FROM inputs i JOIN farms f ON f.id = i.farm_id;

INSERT INTO stock_movements (farm_id, input_id, campaign_id, user_id, type, quantity, stock_before, stock_after, movement_date, note)
SELECT i.farm_id, i.id,
       (SELECT c.id FROM campaigns c WHERE c.farm_id = i.farm_id AND c.status = 'active' ORDER BY c.id LIMIT 1),
       f.manager_id,
       CASE WHEN i.id % 3 = 0 THEN 'consommation'::stock_movement_type ELSE 'sortie'::stock_movement_type END,
       LEAST(i.available_quantity * 0.10, 12),
       i.available_quantity, i.available_quantity - LEAST(i.available_quantity * 0.10, 12),
       now() - (i.id || ' days')::interval,
       'Sortie de démonstration'
FROM inputs i JOIN farms f ON f.id = i.farm_id;

UPDATE inputs SET available_quantity = available_quantity - LEAST(available_quantity * 0.10, 12);

-- =============================================================================
-- 11. ACTIVITÉS AGRICOLES (30)
-- =============================================================================
INSERT INTO activities (farm_id, campaign_id, plot_id, user_id, type, activity_date, description, cost)
SELECT
    c.farm_id, c.id, c.plot_id,
    (SELECT u.id FROM users u
      WHERE u.farm_id = c.farm_id AND u.role_id = 3
      ORDER BY u.id LIMIT 1 OFFSET (g.i % 2)),
    (ARRAY['preparation_sol','semis','repiquage','fertilisation','traitement',
           'desherbage','entretien','recolte','observation','nettoyage'])
        [((g.i - 1) % 10) + 1]::activity_type,
    (c.start_date + ((g.i * 3) % 40)),
    'Activité de démonstration n°' || g.i,
    CASE WHEN g.i % 4 = 0 THEN 25000 + (g.i * 1300) % 60000 ELSE NULL END
FROM generate_series(1, 30) g(i)
JOIN LATERAL (SELECT * FROM campaigns WHERE status = 'active' ORDER BY id
              OFFSET ((g.i - 1) % (SELECT count(*) FROM campaigns WHERE status = 'active')) LIMIT 1) c ON true;

-- =============================================================================
-- 12. RÉCOLTES
-- =============================================================================
INSERT INTO harvests (farm_id, campaign_id, plot_id, user_id, product, harvest_date, quantity, unit, quality, loss_quantity, observation)
SELECT
    c.farm_id, c.id, c.plot_id, c.manager_id,
    (SELECT cr.name FROM crops cr WHERE cr.id = c.crop_id),
    LEAST(CURRENT_DATE, c.expected_end_date) - 2,
    round(c.area * (2 + (c.id % 5) * 0.5), 2),
    (SELECT cr.production_unit FROM crops cr WHERE cr.id = c.crop_id),
    (ARRAY['A','B','A','C'])[(c.id % 4) + 1],
    round(c.area * 0.2, 2),
    'Récolte de démonstration'
FROM campaigns c
WHERE c.status IN ('active','terminee')
ORDER BY c.id
LIMIT 8;

-- =============================================================================
-- 13. DÉPENSES (20)
-- =============================================================================
INSERT INTO expenses (farm_id, campaign_id, user_id, expense_date, amount, category, description, receipt_path)
SELECT
    c.farm_id, c.id, c.manager_id,
    c.start_date + ((g.i * 5) % 40),
    round(15000 + (g.i * 3337) % 180000, 2),
    (ARRAY['semences','engrais','carburant','reparation_pompe','materiel',
           'main_oeuvre','transport','energie_electrique','achat_eau','traitement'])
        [((g.i - 1) % 10) + 1]::expense_category,
    'Dépense de démonstration n°' || g.i,
    CASE WHEN g.i % 3 = 0 THEN 'receipts/demo-' || g.i || '.pdf' ELSE NULL END
FROM generate_series(1, 20) g(i)
JOIN LATERAL (SELECT * FROM campaigns WHERE status = 'active' ORDER BY id
              OFFSET ((g.i - 1) % (SELECT count(*) FROM campaigns WHERE status = 'active')) LIMIT 1) c ON true;

-- =============================================================================
-- 14. RECETTES (15) — dont certaines liées à une récolte (RM-13)
-- =============================================================================
INSERT INTO revenues (farm_id, campaign_id, harvest_id, user_id, revenue_date, amount, product, quantity, unit, client, comment)
SELECT
    c.farm_id, c.id, h.id, c.manager_id,
    LEAST(CURRENT_DATE, c.expected_end_date) - 1,
    round(h.quantity * (1200 + (g.i * 250) % 3000), 2),
    h.product,
    round(h.quantity * 0.25, 2),         -- ≤ 25 % vendu par vente ; ≤ 2 ventes/récolte → RM-13
    h.unit,
    (ARRAY['Marché Analakely','Restaurant Chez Mariette','Grossiste Tana','Hôtel Colbert'])[(g.i % 4) + 1],
    'Vente de démonstration n°' || g.i
FROM generate_series(1, 15) g(i)
JOIN LATERAL (SELECT * FROM harvests ORDER BY id OFFSET ((g.i - 1) % 8) LIMIT 1) h ON true
JOIN campaigns c ON c.id = h.campaign_id;

-- =============================================================================
-- 15. ALERTES
-- =============================================================================
-- Alerte eau critique (posée explicitement, en plus de celle du trigger RM-08)
INSERT INTO alerts (farm_id, water_source_id, type, severity, title, message, is_read, read_at)
VALUES
    (1, 3, 'eau_critique', 'critique', 'Alerte eau : niveau critique de Bassin Sud',
     'Alerte eau : le niveau du Bassin Sud est passé sous le seuil critique de 2 500 L. Vérifiez les irrigations prévues ou planifiez un remplissage.',
     false, NULL);

-- Alerte de stock critique
INSERT INTO alerts (farm_id, input_id, type, severity, title, message, is_read, read_at)
VALUES
    (1, 3, 'stock_critique', 'avertissement', 'Stock critique : Traitement fongicide',
     'Le stock de Traitement fongicide est de 0,5 L, sous le seuil minimal de 3 L.',
     false, NULL),
    (2, 4, 'stock_critique', 'info', 'Stock bas : Carburant gasoil',
     'Le stock de carburant approche du seuil minimal.', true, now() - interval '5 days');

-- Alerte campagne à risque
INSERT INTO alerts (farm_id, campaign_id, type, severity, title, message, is_read, read_at)
VALUES
    (3, 10, 'campagne_a_risque', 'critique', 'Campagne à risque : Tomate bas-fond sud',
     'La campagne CAMP-TOM-2026-002 consomme plus d''eau que le plan prévu. Contrôlez la ressource associée.',
     false, NULL);

-- =============================================================================
-- 16. JOURNAL D'ACTIVITÉ — opérations sensibles de démonstration
-- =============================================================================
INSERT INTO activity_logs (farm_id, user_id, action, entity_type, entity_id, description, ip_address, user_agent)
VALUES
    (1, 2, 'login',         'users',        2, 'Connexion réussie du responsable Tsinjo Maitso', '192.168.1.10', 'Mozilla/5.0'),
    (2, 5, 'login',         'users',        5, 'Connexion réussie du responsable Vokatra Soa',  '192.168.1.11', 'Mozilla/5.0'),
    (1, 3, 'create',        'irrigations',  1, 'Saisie d''une irrigation de 420 L',             '192.168.1.30', 'Mozilla/5.0'),
    (1, 4, 'access_denied', 'irrigations', 99, 'Tentative d''accès à une irrigation d''une autre exploitation', '192.168.1.31', 'Mozilla/5.0'),
    (3, 8, 'validate',      'irrigations', 15, 'Validation d''une irrigation dépassant le seuil', '192.168.1.12', 'Mozilla/5.0');

-- =============================================================================
-- 17. RESYNCHRONISATION DES SÉQUENCES
-- =============================================================================
DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'roles','farms','users','crops','plots','campaigns','water_sources',
        'irrigation_schedules','irrigations','water_movements','activities',
        'inputs','stock_movements','harvests','expenses','revenues','alerts',
        'activity_logs'
    ] LOOP
        EXECUTE format(
            'SELECT setval(pg_get_serial_sequence(%L, ''id''),
                    COALESCE((SELECT max(id) FROM %I), 1))', t, t);
    END LOOP;
END;
$$;

COMMIT;
