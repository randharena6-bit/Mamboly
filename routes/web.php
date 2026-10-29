<?php

use App\Http\Controllers\ActivityController;
use App\Http\Controllers\AlertController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\CampaignController;
use App\Http\Controllers\CropController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\FarmController;
use App\Http\Controllers\HarvestController;
use App\Http\Controllers\InputController;
use App\Http\Controllers\IrrigationController;
use App\Http\Controllers\IrrigationScheduleController;
use App\Http\Controllers\PlotController;
use App\Http\Controllers\PriorityIrrigationController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RevenueController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\StockMovementController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\WaterMovementController;
use App\Http\Controllers\WaterSourceController;
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
| React (`resources/views/auth/switch.blade.php`) et les routes répondent en
| JSON aux requêtes `Accept: application/json` des formulaires, ou par
| redirection sinon.
|
| `/login` et `/register` servent le même écran de switching : la vue reçoit le
| mode initial, la bascule entre les deux se fait ensuite côté client en
| remplaçant l'URL par `history.pushState`.
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

Route::get('/dashboard', [DashboardController::class, 'show'])
    ->middleware('auth')
    ->name('dashboard');

/*
 * Ressource du tableau de bord. Elle est déclarée dans `web` et non dans `api`
 * pour partager la session : l'îlot React lit les données de l'exploitation de
 * l'utilisateur connecté, jamais celles d'une autre exploitation.
 */
Route::get('/dashboard/data', [DashboardController::class, 'data'])
    ->middleware('auth')
    ->name('dashboard.data');

/*
|--------------------------------------------------------------------------
| Paramètres du compte
|--------------------------------------------------------------------------
|
| Le périmètre est toujours `$request->user()` : aucune route n'accepte
| l'identifiant d'un autre compte. La mise à jour de l'exploitation reste
| soumise à `FarmPolicy`.
|
*/

Route::middleware(['auth', 'db.actor'])->group(function (): void {
    Route::get('/parametres', [SettingsController::class, 'show'])->name('settings.index');
    Route::get('/parametres/data', [SettingsController::class, 'data'])->name('settings.data');
    Route::patch('/parametres/profil', [SettingsController::class, 'updateProfile'])->name('settings.profile');
    Route::patch('/parametres/mot-de-passe', [SettingsController::class, 'updatePassword'])->name('settings.password');
    Route::patch('/parametres/preferences', [SettingsController::class, 'updatePreferences'])->name('settings.preferences');
    Route::patch('/parametres/exploitation', [SettingsController::class, 'updateFarm'])->name('settings.farm');
    Route::post('/parametres/sessions/fermer', [SettingsController::class, 'logoutOtherSessions'])->name('settings.sessions.close');
});

/*
|--------------------------------------------------------------------------
| Exploitations
|--------------------------------------------------------------------------
|
| Page hybride : l'administrateur global y supervise toutes les exploitations,
| tout autre compte y retrouve la sienne. Le mode est décidé côté serveur à
| partir du rôle ; `FarmPolicy` refuse à un membre l'accès à une exploitation
| qui n'est pas la sienne.
|
| Les segments littéraux sont déclarés avant `{exploitation}` pour ne pas être
| capturés par le paramètre de route.
|
*/

Route::middleware('auth')->group(function (): void {
    Route::get('/exploitations', [FarmController::class, 'index'])->name('exploitations.index');
    Route::get('/exploitations/create', [FarmController::class, 'create'])->name('exploitations.create');
    Route::post('/exploitations', [FarmController::class, 'store'])->name('exploitations.store');
    Route::get('/exploitations/data', [FarmController::class, 'data'])->name('exploitations.data');

    Route::get('/exploitations/{farm}', [FarmController::class, 'show'])->name('exploitations.show');
    Route::get('/exploitations/{farm}/edit', [FarmController::class, 'edit'])->name('exploitations.edit');
    Route::patch('/exploitations/{farm}', [FarmController::class, 'update'])->name('exploitations.update');
    Route::put('/exploitations/{farm}', [FarmController::class, 'update'])->name('exploitations.update.put');
    Route::delete('/exploitations/{farm}', [FarmController::class, 'destroy'])->name('exploitations.destroy');
    Route::get('/exploitations/{farm}/data', [FarmController::class, 'showData'])->name('exploitations.show.data');

    /*
     * État de lecture des alertes. Les segments littéraux (`alerts`) viennent
     * après `{farm}` : l'exploitation reste le périmètre de la route, et
     * `FarmPolicy` (RM-01) décide de l'accès, jamais l'identifiant d'alerte.
     */
    Route::post('/exploitations/{farm}/alerts/{alert}/read', [FarmController::class, 'markAlertRead'])
        ->name('exploitations.alerts.read');
    Route::post('/exploitations/{farm}/alerts/read-all', [FarmController::class, 'markAllAlertsRead'])
        ->name('exploitations.alerts.read-all');
});

/*
|--------------------------------------------------------------------------
| Ressources métier (JSON, session)
|--------------------------------------------------------------------------
|
| Endpoints consommés par l'îlot React de l'application. Tous les accès sont
| filtrés par l'exploitation de l'utilisateur — `FarmScope` en lecture, les
| politiques en écriture —, le périmètre n'est jamais décidé côté client.
|
*/

Route::middleware(['auth', 'db.actor'])->group(function (): void {
    Route::get('/parcelles', [PlotController::class, 'index'])->name('plots.index');
    Route::post('/parcelles', [PlotController::class, 'store'])->name('plots.store');
    Route::get('/parcelles/{plot}', [PlotController::class, 'show'])->name('plots.show');
    Route::put('/parcelles/{plot}', [PlotController::class, 'update'])->name('plots.update');
    Route::patch('/parcelles/{plot}', [PlotController::class, 'update'])->name('plots.update.patch');
    Route::delete('/parcelles/{plot}', [PlotController::class, 'destroy'])->name('plots.destroy');

    Route::get('/cultures', [CropController::class, 'index'])->name('crops.index');
    Route::post('/cultures', [CropController::class, 'store'])->name('crops.store');
    Route::get('/cultures/{crop}', [CropController::class, 'show'])->name('crops.show');
    Route::put('/cultures/{crop}', [CropController::class, 'update'])->name('crops.update');
    Route::patch('/cultures/{crop}', [CropController::class, 'update'])->name('crops.update.patch');
    Route::delete('/cultures/{crop}', [CropController::class, 'destroy'])->name('crops.destroy');

    Route::get('/campagnes', [CampaignController::class, 'index'])->name('campaigns.index');
    Route::post('/campagnes', [CampaignController::class, 'store'])->name('campaigns.store');
    Route::get('/campagnes/{campaign}', [CampaignController::class, 'show'])->name('campaigns.show');
    Route::put('/campagnes/{campaign}', [CampaignController::class, 'update'])->name('campaigns.update');
    Route::patch('/campagnes/{campaign}', [CampaignController::class, 'update'])->name('campaigns.update.patch');
    Route::delete('/campagnes/{campaign}', [CampaignController::class, 'destroy'])->name('campaigns.destroy');
    Route::post('/campagnes/{campaign}/activer', [CampaignController::class, 'activate'])->name('campaigns.activate');
    Route::post('/campagnes/{campaign}/suspendre', [CampaignController::class, 'suspend'])->name('campaigns.suspend');
    Route::post('/campagnes/{campaign}/cloturer', [CampaignController::class, 'complete'])->name('campaigns.complete');
    Route::post('/campagnes/{campaign}/annuler', [CampaignController::class, 'cancel'])->name('campaigns.cancel');

    Route::get('/ressources-eau', [WaterSourceController::class, 'index'])->name('water-sources.index');
    Route::post('/ressources-eau', [WaterSourceController::class, 'store'])->name('water-sources.store');
    Route::get('/ressources-eau/{waterSource}', [WaterSourceController::class, 'show'])->name('water-sources.show');
    Route::put('/ressources-eau/{waterSource}', [WaterSourceController::class, 'update'])->name('water-sources.update');
    Route::patch('/ressources-eau/{waterSource}', [WaterSourceController::class, 'update'])->name('water-sources.update.patch');
    Route::delete('/ressources-eau/{waterSource}', [WaterSourceController::class, 'destroy'])->name('water-sources.destroy');
    Route::get('/ressources-eau/{waterSource}/mouvements', [WaterMovementController::class, 'sourceHistory'])->name('water-sources.movements');

    Route::get('/mouvements-eau', [WaterMovementController::class, 'index'])->name('water-movements.index');
    Route::post('/mouvements-eau', [WaterMovementController::class, 'store'])->name('water-movements.store');
    Route::get('/mouvements-eau/{waterMovement}', [WaterMovementController::class, 'show'])->name('water-movements.show');

    Route::get('/irrigations', [IrrigationController::class, 'index'])->name('irrigations.index');
    Route::post('/irrigations', [IrrigationController::class, 'store'])->name('irrigations.store');
    Route::get('/irrigations/{irrigation}', [IrrigationController::class, 'show'])->name('irrigations.show');
    Route::put('/irrigations/{irrigation}', [IrrigationController::class, 'update'])->name('irrigations.update');
    Route::patch('/irrigations/{irrigation}', [IrrigationController::class, 'update'])->name('irrigations.update.patch');
    Route::delete('/irrigations/{irrigation}', [IrrigationController::class, 'destroy'])->name('irrigations.destroy');
    Route::post('/irrigations/{irrigation}/valider', [IrrigationController::class, 'validate'])->name('irrigations.validate');
    Route::post('/irrigations/{irrigation}/refuser', [IrrigationController::class, 'reject'])->name('irrigations.reject');
    Route::post('/irrigations/{irrigation}/annuler', [IrrigationController::class, 'cancel'])->name('irrigations.cancel');

    Route::get('/planifications', [IrrigationScheduleController::class, 'index'])->name('schedules.index');
    Route::post('/planifications', [IrrigationScheduleController::class, 'store'])->name('schedules.store');
    Route::get('/planifications/{schedule}', [IrrigationScheduleController::class, 'show'])->name('schedules.show');
    Route::put('/planifications/{schedule}', [IrrigationScheduleController::class, 'update'])->name('schedules.update');
    Route::patch('/planifications/{schedule}', [IrrigationScheduleController::class, 'update'])->name('schedules.update.patch');
    Route::delete('/planifications/{schedule}', [IrrigationScheduleController::class, 'destroy'])->name('schedules.destroy');

    Route::get('/intrants', [InputController::class, 'index'])->name('inputs.index');
    Route::post('/intrants', [InputController::class, 'store'])->name('inputs.store');
    Route::get('/intrants/{input}', [InputController::class, 'show'])->name('inputs.show');
    Route::put('/intrants/{input}', [InputController::class, 'update'])->name('inputs.update');
    Route::patch('/intrants/{input}', [InputController::class, 'update'])->name('inputs.update.patch');
    Route::delete('/intrants/{input}', [InputController::class, 'destroy'])->name('inputs.destroy');
    Route::get('/intrants/{input}/mouvements', [StockMovementController::class, 'inputHistory'])->name('inputs.movements');

    Route::get('/mouvements-stock', [StockMovementController::class, 'index'])->name('stock-movements.index');
    Route::post('/mouvements-stock', [StockMovementController::class, 'store'])->name('stock-movements.store');
    Route::get('/mouvements-stock/{stockMovement}', [StockMovementController::class, 'show'])->name('stock-movements.show');

    Route::get('/recoltes', [HarvestController::class, 'index'])->name('harvests.index');
    Route::post('/recoltes', [HarvestController::class, 'store'])->name('harvests.store');
    Route::get('/recoltes/{harvest}', [HarvestController::class, 'show'])->name('harvests.show');
    Route::put('/recoltes/{harvest}', [HarvestController::class, 'update'])->name('harvests.update');
    Route::patch('/recoltes/{harvest}', [HarvestController::class, 'update'])->name('harvests.update.patch');
    Route::delete('/recoltes/{harvest}', [HarvestController::class, 'destroy'])->name('harvests.destroy');

    Route::get('/depenses', [ExpenseController::class, 'index'])->name('expenses.index');
    Route::post('/depenses', [ExpenseController::class, 'store'])->name('expenses.store');
    Route::get('/depenses/{expense}', [ExpenseController::class, 'show'])->name('expenses.show');
    Route::put('/depenses/{expense}', [ExpenseController::class, 'update'])->name('expenses.update');
    Route::patch('/depenses/{expense}', [ExpenseController::class, 'update'])->name('expenses.update.patch');
    Route::delete('/depenses/{expense}', [ExpenseController::class, 'destroy'])->name('expenses.destroy');

    Route::get('/recettes', [RevenueController::class, 'index'])->name('revenues.index');
    Route::post('/recettes', [RevenueController::class, 'store'])->name('revenues.store');
    Route::get('/recettes/{revenue}', [RevenueController::class, 'show'])->name('revenues.show');
    Route::put('/recettes/{revenue}', [RevenueController::class, 'update'])->name('revenues.update');
    Route::patch('/recettes/{revenue}', [RevenueController::class, 'update'])->name('revenues.update.patch');
    Route::delete('/recettes/{revenue}', [RevenueController::class, 'destroy'])->name('revenues.destroy');

    Route::get('/activites', [ActivityController::class, 'index'])->name('activities.index');
    Route::post('/activites', [ActivityController::class, 'store'])->name('activities.store');
    Route::get('/activites/{activity}', [ActivityController::class, 'show'])->name('activities.show');
    Route::put('/activites/{activity}', [ActivityController::class, 'update'])->name('activities.update');
    Route::patch('/activites/{activity}', [ActivityController::class, 'update'])->name('activities.update.patch');
    Route::delete('/activites/{activity}', [ActivityController::class, 'destroy'])->name('activities.destroy');

    Route::get('/alertes', [AlertController::class, 'index'])->name('alerts.index');
    Route::get('/alertes/{alert}', [AlertController::class, 'show'])->name('alerts.show');
    Route::post('/alertes/{alert}/lue', [AlertController::class, 'markRead'])->name('alerts.read');
    Route::post('/alertes/lues', [AlertController::class, 'markAllRead'])->name('alerts.read-all');

    Route::get('/priorite-irrigation', [PriorityIrrigationController::class, 'index'])->name('priority-irrigation.index');

    Route::get('/rapports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('/rapports/data', [ReportController::class, 'data'])->name('reports.data');

    Route::get('/comptes', [UserController::class, 'index'])->name('users.index');
    Route::post('/comptes', [UserController::class, 'store'])->name('users.store');
    Route::get('/comptes/{user}', [UserController::class, 'show'])->name('users.show');
    Route::put('/comptes/{user}', [UserController::class, 'update'])->name('users.update');
    Route::patch('/comptes/{user}', [UserController::class, 'update'])->name('users.update.patch');
    Route::delete('/comptes/{user}', [UserController::class, 'destroy'])->name('users.destroy');
});

Route::view('/demo', 'stub', [
    'title' => 'Démonstration',
    'eyebrow' => 'Découverte',
    'description' => 'Un parcours de démonstration guidé sera disponible prochainement. En attendant, explorez l’aperçu interactif du tableau de bord sur la page d’accueil.',
])->name('demo');
