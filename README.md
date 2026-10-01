# Mamboly

Application Laravel 12. Point de depart structure, francophone (locale `fr`), timezone `Indian/Antananarivo`, base SQLite par defaut.

## Pre-requis

- PHP 8.2+ (extensions `pdo_sqlite`, `mbstring`, `openssl`, `curl`, `zip`)
- Composer 2
- Node 20+ / npm

## Installation

```bash
composer run setup
```

Cette commande enchaine : `composer install`, creation de `.env`, generation de la cle, migrations, `npm install` et build des assets.

Installation manuelle, etape par etape :

```bash
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
npm install
npm run build
```

## Demarrage en developpement

```bash
composer run dev
```

Lance en parallele le serveur (`artisan serve`), le listener de queue, la lecture des logs (`pail`) et Vite. Acces sur <http://127.0.0.1:8000>.

Pour lancer uniquement le serveur PHP :

```bash
php artisan serve
```

Vite doit tourner separement (`npm run dev`) pour que les assets se rechargent a chaud.

## Base de donnees

Par defaut : SQLite (`database/database.sqlite`). Pour MySQL, decommenter et renseigner les variables `DB_*` dans `.env`, puis :

```bash
php artisan migrate:fresh --seed
```

## Tests et qualite

```bash
php artisan test          # ou composer test
vendor/bin/pint           # formatage du code PHP
```

## Arborescence

```
app/
  Casts/           casts de types personnalises
  Console/         commandes Artisan
  Enums/           enums PHP
  Exceptions/      exceptions metier
  Http/
    Controllers/   controleurs
    Middleware/    middleware
    Requests/      validation des entrees
    Resources/     transformation des sorties (API)
  Models/          modeles Eloquent (+ Concerns)
  Notifications/   notifications
  Policies/        policies d'autorisation
  Providers/       service providers
  Services/        logique metier transverse
  Support/         helpers et classes utilitaires
bootstrap/app.php  configuration application, routes, middleware, exceptions
config/            configuration par environnement
database/
  factories/       factories pour les tests
  migrations/      schema de la base
  seeders/         donnees initiales
resources/
  css/ js/         assets Vite (entrees : app.css, app.js)
  views/           vues Blade (layouts/, components/, errors/)
routes/
  web.php          routes web (prefixe / , session + CSRF)
  api.php          routes API (prefixe /api)
  console.php      commandes Artisan et planification
tests/
  Feature/         tests d'integration (Http, Auth, Api)
  Unit/            tests unitaires
.env               configuration locale, non versionne
```

## Points de depart configures

- `APP_NAME=Mamboly`, `APP_LOCALE=fr`, `APP_FALLBACK_LOCALE=en`, `APP_TIMEZONE=Indian/Antananarivo`
- Cle d'application deja generee dans `.env`
- Fichier SQLite cree et migrations de base appliquees (`users`, `cache`, `jobs`)
- Layout Blade minimal dans `resources/views/layouts/app.blade.php`
- `routes/api.php` declare dans `bootstrap/app.php` (prefixe `/api`), avec middleware `verified` en alias. Le fichier est vide : `php artisan install:api` y ajoute la route `/api/user` avec Sanctum
- Dossiers de travail vides avec `.gitkeep` (git ne versionne pas les dossiers vides)
- Dossier `vendor/` et `node_modules/` ignores par git

## Prochaines etapes

- Modeles et migrations : `php artisan make:model Foo -mf`
- Controleur + requete validee : `php artisan make:controller FooController` puis `php artisan make:request StoreFooRequest`
- API : `php artisan install:api` (Sanctum) pour l'authentification par jeton
- Authentification web : `php artisan breeze:install` si une interface de connexion est necessaire
- Tests : `php artisan make:test FooTest`