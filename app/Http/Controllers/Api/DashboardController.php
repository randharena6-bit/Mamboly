<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Farm;
use App\Services\DashboardService;
use App\Services\FinanceService;
use App\Services\PriorityIrrigationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;

/**
 * Tableau de bord et indicateurs consolidés (API jetons).
 */
class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboard,
        private readonly FinanceService $finance,
        private readonly PriorityIrrigationService $priority,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $payload = $this->dashboard->forUser($request->user());
        $payload['user'] = (new UserResource($request->user()->load('role:id,name', 'farm:id,name')))->resolve();

        return response()->json($payload);
    }

    /** Synthèse financière d'une exploitation (réservé aux membres / admin). */
    public function finance(Request $request): JsonResponse
    {
        $farm = $request->user()->farm;

        if ($farm === null) {
            abort_if($request->missing('farm_id'), 422, 'Sélectionnez une exploitation.');
            $farm = Farm::findOrFail($request->integer('farm_id'));
        }

        Gate::authorize('view', $farm);

        $from = $request->filled('from') ? Carbon::parse($request->string('from')) : null;
        $to = $request->filled('to') ? Carbon::parse($request->string('to')) : null;

        return response()->json([
            'summary' => $this->finance->summary($farm, $from, $to),
            'byCategory' => $this->finance->expensesByCategory($farm, $from, $to),
        ]);
    }

    /** Parcelles à irriguer en priorité (CDC § 6.10). */
    public function priority(Request $request): JsonResponse
    {
        $farm = $request->user()->farm;

        if ($farm === null) {
            abort_if($request->missing('farm_id'), 422, 'Sélectionnez une exploitation.');
            $farm = Farm::findOrFail($request->integer('farm_id'));
        }

        Gate::authorize('view', $farm);

        return response()->json(['priority' => $this->priority->forFarm($farm)]);
    }
}