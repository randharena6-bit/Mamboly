-- =============================================================================
--  AgriWater — Exemples de requêtes (CDC § 9 indicateurs, § 8 écriture)
--
--  Usage :
--    docker exec -it agriwater-postgres psql -U agriwater -d agriwater
--    \i database/exemples_requetes.sql
--
--  Les sections 12 à 16 provoquent volontairement une erreur pour montrer
--  les règles métier (RM) appliquées par la base. Elles sont sans effet sur
--  les données : la transaction est annulée.
-- =============================================================================
\pset border 2

-- -----------------------------------------------------------------------------
-- 1. Tableau de bord par exploitation (CDC § 9.1)
-- -----------------------------------------------------------------------------
SELECT farm_name, active_campaigns, plot_count,
       round(total_area_m2 / 10000, 2) AS total_ha,
       water_available, critical_water_sources, unread_alerts,
       round(marge_farm, 0) AS marge_ariary
FROM v_farm_dashboard ORDER BY farm_id;

-- -----------------------------------------------------------------------------
-- 2. Indicateur 1 — consommation d'eau par campagne (CDC § 9.2)
-- -----------------------------------------------------------------------------
SELECT campaign_code, crop_name, plot_code,
       water_consumed AS litres, irrigation_count,
       last_irrigation_at::date
FROM v_water_consumption_by_campaign
WHERE water_consumed > 0
ORDER BY water_consumed DESC;

-- -----------------------------------------------------------------------------
-- 3. Indicateur 2 — consommation d'eau par m²
-- -----------------------------------------------------------------------------
SELECT plot_code, area_m2, water_consumed, consumption_l_per_m2
FROM v_water_consumption_by_plot
ORDER BY consumption_l_per_m2 DESC NULLS LAST;

-- -----------------------------------------------------------------------------
-- 4. Indicateur 3 — autonomie estimée des réserves
-- -----------------------------------------------------------------------------
SELECT water_source_name, available_quantity, critical_threshold,
       usable_quantity, estimated_autonomy_days
FROM v_reserve_autonomy
ORDER BY estimated_autonomy_days NULLS LAST;

-- -----------------------------------------------------------------------------
-- 5. Indicateur 4 — taux de réalisation des irrigations planifiées
-- -----------------------------------------------------------------------------
SELECT campaign_code, planned_count, realized_count, realization_rate_pct
FROM v_irrigation_realization_rate
ORDER BY realization_rate_pct;

-- -----------------------------------------------------------------------------
-- 6. Module personnel — score de priorité d'irrigation (CDC § 6.10)
--    score = (jours sans irrigation x 4) + besoin en eau
--            + poids de la priorité manuelle + bonus faible humidité
-- -----------------------------------------------------------------------------
SELECT plot_code, crop_name, days_since_last_irrigation AS jours,
       soil_moisture, manual_priority, priority_score, proposed_priority
FROM v_irrigation_priority
ORDER BY priority_score DESC;

-- -----------------------------------------------------------------------------
-- 7. Vue relationnelle complète d'une irrigation (API / exports)
-- -----------------------------------------------------------------------------
SELECT performed_at::date, campaign_code, plot_code, water_source_name,
       quantity, unit, method, performed_by_name, validated_by_name
FROM v_irrigation_full
ORDER BY performed_at DESC;

-- -----------------------------------------------------------------------------
-- 8. Alertes non lues, avec l'objet concerné
-- -----------------------------------------------------------------------------
SELECT a.type, a.severity, a.title, a.created_at::date,
       COALESCE(ws.name, i.name, c.code) AS cible
FROM alerts a
LEFT JOIN water_sources ws ON ws.id = a.water_source_id
LEFT JOIN inputs        i  ON i.id  = a.input_id
LEFT JOIN campaigns     c  ON c.id  = a.campaign_id
WHERE a.is_read = false
ORDER BY a.created_at DESC;

-- -----------------------------------------------------------------------------
-- 9. Marge par campagne (recettes - dépenses)
-- -----------------------------------------------------------------------------
SELECT c.code AS campagne,
       round(COALESCE(d.total_dep, 0), 0) AS depenses,
       round(COALESCE(r.total_rec, 0), 0) AS recettes,
       round(COALESCE(r.total_rec, 0) - COALESCE(d.total_dep, 0), 0) AS marge
FROM campaigns c
LEFT JOIN (SELECT campaign_id, sum(amount) AS total_dep FROM expenses GROUP BY 1) d
       ON d.campaign_id = c.id
LEFT JOIN (SELECT campaign_id, sum(amount) AS total_rec FROM revenues  GROUP BY 1) r
       ON r.campaign_id = c.id
WHERE c.status = 'active'
ORDER BY marge DESC;

-- -----------------------------------------------------------------------------
-- 10. Journal d'eau complet d'une ressource (traçabilité RM-09)
-- -----------------------------------------------------------------------------
SELECT wm.movement_date::date AS date, wm.type, wm.quantity,
       wm.quantity_before, wm.quantity_after,
       COALESCE(i.id::text, '-') AS irrigation
FROM water_movements wm
LEFT JOIN irrigations i ON i.id = wm.irrigation_id
WHERE wm.water_source_id = 1
ORDER BY wm.movement_date DESC;

-- -----------------------------------------------------------------------------
-- 11. Intrants sous le seuil critique (RM-12)
-- -----------------------------------------------------------------------------
SELECT name, category, available_quantity, minimum_threshold, unit
FROM inputs
WHERE available_quantity <= minimum_threshold
ORDER BY available_quantity;

-- -----------------------------------------------------------------------------
-- 12. Recherche floue (index trigrammes) : tolère « timaté », « Tomates », …
-- -----------------------------------------------------------------------------
SELECT c.name AS campagne, p.name AS parcelle, cr.name AS culture
FROM campaigns c
JOIN plots p  ON p.id = c.plot_id
JOIN crops cr ON cr.id = c.crop_id
WHERE p.name % 'tomate' OR cr.name % 'tomate'
ORDER BY 1;

-- -----------------------------------------------------------------------------
-- 13. Consommation quotidienne depuis la vue matérialisée (analytique)
-- -----------------------------------------------------------------------------
SELECT day, sum(total_quantity) AS litres, sum(irrigation_count) AS n_irrigations
FROM mv_water_consumption_daily
GROUP BY day ORDER BY day DESC LIMIT 10;
--Rafraîchissement (hors transaction) : SELECT agriwater_refresh_analytics();


-- =============================================================================
--  14. ÉCRITURE — Enregistrer une irrigation (transaction complète, CDC § 8.1)
--      Trois écritures indissociables : irrigation + mouvement d'eau + stock.
-- =============================================================================
/*
BEGIN;

INSERT INTO irrigations (farm_id, campaign_id, plot_id, water_source_id, performed_by,
                         scheduled_at, performed_at, quantity, duration_minutes, method, status)
VALUES (1, 1, 1, 1, 3, now() - interval '2 h', now(), 850, 45, 'goutte_a_goutte', 'realisee')
RETURNING id;

INSERT INTO water_movements (farm_id, water_source_id, campaign_id, irrigation_id, user_id,
                             type, quantity, quantity_before, quantity_after, movement_date, note)
SELECT 1, 1, 1, currval('irrigations_id_seq'), 3,
       'consommation', 850, available_quantity, available_quantity - 850,
       now(), 'Consommation irrigation'
FROM water_sources WHERE id = 1;

UPDATE water_sources
   SET available_quantity = available_quantity - 850
 WHERE id = 1;

COMMIT;
*/

-- Au-delà du seuil (2000 L par défaut), ajouter validated_by avec le responsable :
--   ... , validated_by = 2, ...

-- Rend l'identité applicative disponible dans activity_logs :
--   SET LOCAL agriwater.user_id = '3';


-- =============================================================================
--  15. RÈGLES MÉTIER — ces requêtes échouent volontairement (annulation incluse)
-- =============================================================================

-- RM-10 : irrigation > 2000 L sans validation du responsable
/*
BEGIN;
INSERT INTO irrigations (farm_id, campaign_id, plot_id, water_source_id, performed_by,
                         performed_at, quantity, method, status)
VALUES (1, 1, 1, 1, 3, now(), 3500, 'pompe', 'realisee');
ROLLBACK;
*/

-- RM-01 / RM-07 : objets d'une autre exploitation / parcelle incohérente
/*
BEGIN;
INSERT INTO irrigations (farm_id, campaign_id, plot_id, water_source_id, performed_by,
                         performed_at, quantity, method, status)
VALUES (1, 2, 1, 1, 3, now(), 500, 'pompe', 'realisee');
ROLLBACK;
*/

-- RM-02 : ressource en eau non active (statut « maintenance »)
/*
BEGIN;
INSERT INTO irrigations (farm_id, campaign_id, plot_id, water_source_id, performed_by,
                         performed_at, quantity, method, status)
VALUES (3, 12, 12, 8, 9, now(), 500, 'pompe', 'realisee');
ROLLBACK;
*/

-- RM-11 : opération sur une campagne terminée
/*
BEGIN;
INSERT INTO expenses (farm_id, campaign_id, user_id, expense_date, amount, category, description)
VALUES (1, 13, 2, CURRENT_DATE, 25000, 'semences', 'Achat sur campagne terminee');
ROLLBACK;
*/

-- RM-09 : variation du stock sans mouvement d'eau traçable
--         (déclencheur différé : l'erreur survient au COMMIT, qui annule tout)
/*
BEGIN;
UPDATE water_sources SET available_quantity = available_quantity - 100 WHERE id = 2;
COMMIT;   -- ERROR RM-09
*/

-- RM-13 : quantité vendue supérieure à la quantité récoltée
/*
BEGIN;
INSERT INTO revenues (farm_id, campaign_id, harvest_id, user_id, revenue_date,
                      amount, quantity, unit)
VALUES (1, 1, 1, 2, CURRENT_DATE, 100000, 99999, 'kg');
ROLLBACK;
*/