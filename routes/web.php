<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Pages marketing
|--------------------------------------------------------------------------
*/

Route::view('/', 'landing')->name('home');

/*
 * Pages de contenu. Elles partagent la vue `stub` : le contenu rédactionnel
 * arrivera plus tard, la navigation et le rendu sont déjà en place.
 * `$pages[route] = [titre, sur-titre, description]`
 */
$pages = [
    'features' => [
        'title' => 'Fonctionnalités',
        'eyebrow' => 'Produit',
        'description' => 'Le détail des modules AgriWater — parcelles, stocks, activités, finances et eau — est en cours de rédaction. La section Fonctionnalités de la page d’accueil en présente déjà l’essentiel.',
    ],
    'security' => [
        'title' => 'Sécurité',
        'eyebrow' => 'Confiance',
        'description' => 'Isolation multi-exploitations, rôles, traçabilité et chiffrement : le détail de nos engagements sécurité arrive bientôt.',
    ],
    'pricing' => [
        'title' => 'Tarifs',
        'eyebrow' => 'Offres',
        'description' => 'Les grilles tarifaires AgriWater sont en préparation. La création d’une exploitation reste gratuite et sans carte bancaire.',
    ],
    'documentation' => [
        'title' => 'Documentation',
        'eyebrow' => 'Ressources',
        'description' => 'Guides de prise en main, référence de l’API et notes de version seront publiés ici.',
    ],
    'contact' => [
        'title' => 'Contact',
        'eyebrow' => 'Équipe',
        'description' => 'Une question sur la plateforme ? Écrivez-nous, notre équipe vous répond sous deux jours ouvrés.',
    ],
    'blog' => [
        'title' => 'Blog',
        'eyebrow' => 'Actualités',
        'description' => 'Conseils de gestion agricole, bonnes pratiques d’irrigation et coulisses du produit.',
    ],
    'confidentialite' => [
        'title' => 'Politique de confidentialité',
        'eyebrow' => 'Légal',
        'description' => 'Comment AgriWater traite et protège les données de vos exploitations.',
    ],
    'conditions' => [
        'title' => 'Conditions d’utilisation',
        'eyebrow' => 'Légal',
        'description' => 'Les règles d’utilisation de la plateforme AgriWater seront publiées ici.',
    ],
];

foreach ($pages as $slug => $page) {
    Route::view("/{$slug}", 'stub', $page)->name($slug);
}

/*
|--------------------------------------------------------------------------
| Authentification
|--------------------------------------------------------------------------
|
| Les écrans /login et /register remplacent ces routes dès que l’authentification
| Laravel (Breeze, Jetstream, Filament) est installée : ces paquets définissent
| /login et /register sur les mêmes verbes, leurs routes prendront le dessus.
|
*/

Route::view('/login', 'stub', [
    'title' => 'Connexion',
    'eyebrow' => 'Espace membre',
    'description' => 'L’écran de connexion sera alimenté par l’authentification Laravel. Renseignez les identifiants de votre exploitation.',
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
    'description' => 'Le tableau de bord AgriWater est détaillé sur la page d’accueil. Son accès réel nécessite l’authentification.',
])->middleware('auth')->name('dashboard');

Route::view('/demo', 'stub', [
    'title' => 'Démonstration',
    'eyebrow' => 'Découverte',
    'description' => 'Un parcours de démonstration guidé sera disponible prochainement. En attendant, explorez l’aperçu interactif du tableau de bord sur la page d’accueil.',
])->name('demo');