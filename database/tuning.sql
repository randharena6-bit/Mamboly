-- =============================================================================
--  AgriWater — Réglages du moteur PostgreSQL
--
--  Cette étape est DISTINTE des migrations : elle modifie la configuration du
--  serveur, pas le schéma. Elle n'est donc pas rejouée par `migrate:fresh`.
--
--  Deux voies possibles :
--    • SQL   : ce fichier, via ALTER SYSTEM (voir le conteneur du projet)
--    • Fichier: montage de postgresql.conf dans docker-compose.yml
--  Les deux sont cumulables ; le SQL est plus pratique pour un
--  environnement éphémère, le fichier pour un déploiement reproductible.
--
--  Application :
--    psql -U agriwater -d agriwater -v ON_ERROR_STOP=1 -f database/tuning.sql
--  Puis, pour les paramètres qui ne sont pas rechargeables à chaud :
--    docker restart agriwater-postgres
--
--  Référence : https://www.postgresql.org/docs/current/runtime-config.html
-- =============================================================================

\echo '== AgriWater — tuning PostgreSQL =='

-- -----------------------------------------------------------------------------
--  1. MÉMOIRE
--     PostgreSQL n'utilise que shared_buffers pour le cache relationnel ; le
--     reste du cache est délégué au noyau (donc à l'OS). Bien dimensionner
--     effective_cache_size évite au planificateur de sous-estimer la mémoire
--     réellement disponible, et de choisir à tort une jointure par hachage
--     qui déborde sur disque.
-- -----------------------------------------------------------------------------
ALTER SYSTEM SET shared_buffers = '512MB';              -- 25 % de 2 Go
ALTER SYSTEM SET effective_cache_size = '1536MB';       -- ~75 % de 2 Go
ALTER SYSTEM SET work_mem = '16MB';                    -- par opération de tri ou de hachage
ALTER SYSTEM SET maintenance_work_mem = '256MB';       -- index, VACUUM, ANALYZE
ALTER SYSTEM SET temp_buffers = '32MB';

-- -----------------------------------------------------------------------------
--  2. PLANIFICATEUR
--     random_page_cost = 1.1 : valeur SSD (1.0 = stockage mémoire idéal, 4.0 = disque
--     rotatif). Sur un SSD, laisser 4.0 conduit PostgreSQL à shunir les index à
--     tort. C'est le réglage qui change le plus les plans d'exécution en
--    son comportement devient favorable.
-- -----------------------------------------------------------------------------
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;       -- lectures parallèles
ALTER SYSTEM SET default_statistics_target = 200;      -- statistiques plus fines
ALTER SYSTEM SET jit = off;                            -- le coût de compilation
                                                       -- du JIT dépasse le gain
                                                       -- sur des requêtes de
                                                       -- moins de 100 ms
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;   -- parallélisme des scans
ALTER SYSTEM SET max_parallel_workers = 8;
ALTER SYSTEM SET min_parallel_table_scan_size = '1MB';  -- tables, notamment les partitions

-- -----------------------------------------------------------------------------
--  3. ÉCRITURES CONCURRENTES
--     Les agents de la démo écrivent beaucoup (journal d'eau, audit).
--     sans ces réglages, les points de contrôle sérialisent les écritures.
-- -----------------------------------------------------------------------------
ALTER SYSTEM SET max_wal_size = '2GB';                 -- moins de checkpoints
ALTER SYSTEM SET min_wal_size = '128MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET checkpoint_timeout = '15min';
ALTER SYSTEM SET synchronous_commit = 'on';            -- on garde la durabilité :
                                                       -- ne jamais activer pour
                                                       -- de la performance
ALTER SYSTEM SET wal_compression = on;                 -- WAL compressé
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET commit_delay = 200;                   -- regroupe les fsync
ALTER SYSTEM SET commit_siblings = 5;
ALTER SYSTEM SET autovacuum_max_workers = 4;           -- indispensable avec des
                                                       -- partitions : chaque
                                                       -- feuille est un candidat
ALTER SYSTEM SET autovacuum_naptime = '30s';

-- -----------------------------------------------------------------------------
--  4. CONNEXIONS ET REPLICATION DES REQUÊTES
-- -----------------------------------------------------------------------------
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET listen_addresses = '*';
ALTER SYSTEM SET password_encryption = 'scram-sha-256';
ALTER SYSTEM SET log_min_duration_statement = 500;     -- journalise les requêtes
                                                       -- lentes > 500 ms
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_lock_waits = on;                  -- diagnostique les
                                                       -- attentes de verrous
                                                       -- (SELECT ... FOR UPDATE)
ALTER SYSTEM SET track_io_timing = on;                 -- EXPLAIN ANALYZE avec
                                                       -- temps d'E/S réels
ALTER SYSTEM SET track_activity_query_size = 4096;     -- trace les requêtes
                                                       -- longues en entier
ALTER SYSTEM SET default_transaction_isolation = 'read committed';

-- -----------------------------------------------------------------------------
--  5. REQUÊTES DE DIAGNOSTIC
--     Extensions d'observation, à activer si elles sont disponibles.
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- -----------------------------------------------------------------------------
--  6. APPLICATION
--     shared_buffers, wal_buffers, max_connections, effective_cache_size
--     exigent un redémarrage ; les autres sont pris en compte à chaud.
-- -----------------------------------------------------------------------------
SELECT pg_reload_conf();

\echo ''
\echo 'Redémarrage requis pour shared_buffers / wal_buffers / max_connections :'
\echo '  docker restart agriwater-postgres'
\echo ''
\echo 'Contrôle :'
\echo '  SELECT name, setting, unit, source FROM pg_settings'
\echo '   WHERE name IN ('''shared_buffers''',''effective_cache_size'',''random_page_cost'','
\echo '                 ''jit'',''work_mem'',''max_wal_size'');'