<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\IrrigationController;
use App\Http\Controllers\Api\ReferenceController;
use App\Http\Controllers\Api\WaterSourceController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API AgriWater (jetons Sanctum)
|--------------------------------------------------------------------------
|
| Façade REST destinée aux clients mobiles et intégrations. L'authentification
| par jeton remplace la session ; le cloisonnement par exploitation reste
| identique (FarmScope + politiques), il ne dépend jamais du client.
|
*/

Route::post('/login', [AuthController::class, 'login'])->name('api.login');

Route::middleware(['auth:sanctum', 'db.actor'])->group(function (): void {
    Route::get('/me', [AuthController::class, 'me'])->name('api.me');
    Route::post('/logout', [AuthController::class, 'logout'])->name('api.logout');

    Route::get('/dashboard', [DashboardController::class, 'show'])->name('api.dashboard');
    Route::get('/dashboard/finance', [DashboardController::class, 'finance'])->name('api.dashboard.finance');
    Route::get('/dashboard/priority-irrigation', [DashboardController::class, 'priority'])->name('api.dashboard.priority');

    Route::get('/water-sources', [WaterSourceController::class, 'index'])->name('api.water-sources.index');
    Route::get('/water-sources/{waterSource}', [WaterSourceController::class, 'show'])->name('api.water-sources.show');
    Route::get('/water-sources/{waterSource}/movements', [WaterSourceController::class, 'movements'])->name('api.water-sources.movements');
    Route::post('/water-sources/{waterSource}/movements', [WaterSourceController::class, 'applyMovement'])->name('api.water-sources.movements.store');

    Route::get('/irrigations', [IrrigationController::class, 'index'])->name('api.irrigations.index');
    Route::post('/irrigations', [IrrigationController::class, 'store'])->name('api.irrigations.store');
    Route::get('/irrigations/{irrigation}', [IrrigationController::class, 'show'])->name('api.irrigations.show');
    Route::post('/irrigations/{irrigation}/validate', [IrrigationController::class, 'validate'])->name('api.irrigations.validate');
    Route::post('/irrigations/{irrigation}/reject', [IrrigationController::class, 'reject'])->name('api.irrigations.reject');
    Route::post('/irrigations/{irrigation}/cancel', [IrrigationController::class, 'cancel'])->name('api.irrigations.cancel');

    Route::get('/plots', [ReferenceController::class, 'plots'])->name('api.plots.index');
    Route::get('/plots/{plot}', [ReferenceController::class, 'plot'])->name('api.plots.show');
    Route::get('/campaigns', [ReferenceController::class, 'campaigns'])->name('api.campaigns.index');
    Route::get('/campaigns/{campaign}', [ReferenceController::class, 'campaign'])->name('api.campaigns.show');
});
