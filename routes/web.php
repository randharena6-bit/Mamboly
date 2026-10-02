<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Pages marketing
|--------------------------------------------------------------------------
*/

Route::view('/', 'landing')->name('home');

// Pages de contenu : ancres de la landing page, puis pages dédiées à venir.
Route::view('/features', 'stub', [
    'title' => 'Fonctionnalités',
    'eyebrow' => 'Produit',
    'description' => 'La page détaillée des modules AgriWater (parcelles, stocks, activités, finances, eau) est en cours de rédaction. La section Fonctionnalités de la page d’accueil en présente déjà l’essentiel.',
])->name('features');

Route::view('/security', 'stub', [
    'title' => 'Sécurité',
    'eyebrow' => 'Confiance',
    'description' => 'Isolation multi-exploitations, rôles, traçabilité et chiffrement : le détail de nos engagements sécurité arrive bientôt.',
])->name('security');

Route::view('/pricing', 'stub', [
    'title' => 'Tarifs',
    'eyebrow' => 'Offres',
    'description' => 'Les grilles tarifaires AgriWater sont en cours de préparation. La création d’exploitation reste gratuite et sans carte bancaire.',
])->name('pricing');

/*
|--------------------------------------------------------------------------
| Authentification
|--------------------------------------------------------------------------
|
| Les écrans /login et /register remplacent ces routes dès que l'authentification
| Laravel (Breeze, Jetstream ou Filament) est installée : Breeze définit
| /login et /register sur les mêmes verbes, ses routes remplacent ces stubs.
|
*/

Route::view('/login', 'stub', [
    'title' => 'Connexion',
    'eyebrow' => 'Espace membre',
    'description' => 'L’écran de connexion sera alimenté par l’authentification Laravel. Connectez-vous avec les identifiants de votre exploitation.',
])->name('login');

Route::view('/register', 'stub', [
    'title' => 'Créer votre exploitation',
    'eyebrow' => 'Inscription',
    'description' => 'L’inscription vous permettra de créer votre première exploitation et d’inviter vos collaborateurs en quelques secondes.',
])->name('register');

/*
|--------------------------------------------------------------------------
| Application
|--------------------------------------------------------------------------
*/

Route::view('/dashboard', 'stub', [
    'title' => 'Tableau de bord',
    'eyebrow' => 'Application',
    'description' => 'Le tableau de bord AgriWater est représenté en détail sur la page d’accueil. Son accès réelrequiert l’authentification.',
])->middleware('auth')->name('dashboard');

Route::view('/demo', 'stub', [
    'title' => 'Démonstration',
    'eyebrow' => 'Découverte',
    'description' => 'Un parcours de démonstration guidé sera disponible prochainement. En attendant, explorez l’aperçu interactif du tableau de bord sur la page d’accueil.',
])->name('demo');