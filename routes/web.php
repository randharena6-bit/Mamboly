<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;
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
| Authentification par session, écrite à la main : les écrans sont montés par
| React (`resources/views/auth/`) et les routesrespondent en JSON aux requêtes
| `Accept: application/json` des formulaires, ou par redirection sinon.
|
*/

Route::middleware('guest')->group(function (): void {
    Route::get('/login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store']);

    Route::get('/register', [RegisteredUserController::class, 'create'])->name('register');
    Route::post('/register', [RegisteredUserController::class, 'store']);
});

Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');

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