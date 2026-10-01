<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Noyau applicatif : rôles, exploitations, utilisateurs + tables techniques
 * de Laravel (password_reset_tokens, sessions).
 *
 * L'ordre respecte la dépendance circulaire farms.manager_id -> users.id :
 *   roles -> farms (sans manager_id) -> users -> ALTER farms.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
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

        CREATE TABLE farms (
            id         bigserial PRIMARY KEY,
            name       varchar(150) NOT NULL,
            location   varchar(255) NOT NULL,
            type       varchar(50)  NOT NULL DEFAULT 'maraichage',
            total_area numeric(12,2) NOT NULL DEFAULT 0,
            manager_id bigint,
            status     farm_status NOT NULL DEFAULT 'active',
            created_at timestamptz  NOT NULL DEFAULT now(),
            updated_at timestamptz  NOT NULL DEFAULT now(),
            CONSTRAINT farms_name_key UNIQUE (name),
            CONSTRAINT farms_total_area_check CHECK (total_area >= 0)
        );

        COMMENT ON TABLE farms IS 'Exploitations agricoles. Racine du cloisonnement multi-exploitations (RM-01).';

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

        ALTER TABLE farms
            ADD CONSTRAINT farms_manager_id_fkey
            FOREIGN KEY (manager_id) REFERENCES users (id) ON DELETE SET NULL;

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
        SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
        DROP TABLE IF EXISTS sessions CASCADE;
        DROP TABLE IF EXISTS password_reset_tokens CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
        DROP TABLE IF EXISTS farms CASCADE;
        DROP TABLE IF EXISTS roles CASCADE;
        SQL);
    }
};
