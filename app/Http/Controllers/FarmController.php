<?php

namespace App\Http\Controllers;

use App\Http\Requests\DestroyFarmRequest;
use App\Http\Requests\StoreFarmRequest;
use App\Http\Requests\UpdateFarmRequest;
use App\Models\Alert;
use App\Models\Farm;
use App\Services\FarmService;
use Illuminate\Contracts\View\View;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Page `/exploitations`, hybride selon le rôle : l'administrateur global y
 * supervise toutes les exploitations, tout autre compte y retrouve la sienne.
 *
 * La page et sa ressource JSON partagent le même service : le rendu HTML sert
 * l'îlot React, qui appelle `/exploitations/data` (ou
 * `/exploitations/{exploitation}/data`) pour charger les chiffres. Le mode
 * affiché et l'accès à une exploitation sont décidés côté serveur, à partir de
 * `users.farm_id` et de `FarmPolicy` — jamais d'un paramètre de requête.
 */
class FarmController extends Controller
{
    public function __construct(private readonly FarmService $farms) {}

    public function index(): View
    {
        return view('exploitations.index', [
            'dataUrl' => route('exploitations.data'),
        ]);
    }

    public function data(Request $request): JsonResponse
    {
        return response()->json($this->farms->overviewFor($request->user()));
    }

    public function create(): View
    {
        Gate::authorize('create', Farm::class);

        return view('exploitations.create', [
            'dataUrl' => route('exploitations.index'),
        ]);
    }

    public function store(StoreFarmRequest $request): JsonResponse|RedirectResponse
    {
        $farm = Farm::create($request->validated());

        if ($request->expectsJson()) {
            return response()->json([
                'id' => $farm->id,
                'message' => "L'exploitation a été créée avec succès.",
                'redirect' => route('exploitations.show', $farm),
            ], 201);
        }

        return redirect()->route('exploitations.show', $farm);
    }

    public function show(Request $request, Farm $farm): View
    {
        $this->authorize('view', $farm);

        return view('exploitations.show', [
            'farm' => $farm,
            'dataUrl' => route('exploitations.show.data', $farm),
        ]);
    }

    public function showData(Request $request, Farm $farm): JsonResponse
    {
        $this->authorize('view', $farm);

        return response()->json($this->farms->detailFor($request->user(), $farm));
    }

    public function edit(Request $request, Farm $farm): View
    {
        $this->authorize('update', $farm);

        return view('exploitations.edit', [
            'farm' => $farm,
            'dataUrl' => route('exploitations.show', $farm),
        ]);
    }

    public function update(UpdateFarmRequest $request, Farm $farm): JsonResponse|RedirectResponse
    {
        $farm->update($request->validated());

        if ($request->expectsJson()) {
            return response()->json([
                'id' => $farm->id,
                'message' => "L'exploitation a été mise à jour avec succès.",
                'redirect' => route('exploitations.show', $farm),
            ]);
        }

        return redirect()->route('exploitations.show', $farm);
    }

    public function destroy(DestroyFarmRequest $request, Farm $farm): JsonResponse|RedirectResponse
    {
        $farm->delete();

        if ($request->expectsJson()) {
            return response()->json([
                'message' => "L'exploitation a été supprimée avec succès.",
                'redirect' => route('exploitations.index'),
            ]);
        }

        return redirect()->route('exploitations.index');
    }

    /**
     * Marque une alerte comme lue.
     *
     * L'alerte est obligatoirement rattachée à l'exploitation demandée : le
     * cloisonnement (RM-01) s'appuie sur `FarmPolicy` puis sur ce contrôle,
     * une identification d'alerte n'ouvre jamais l'accès à une autre exploitation.
     */
    public function markAlertRead(Request $request, Farm $farm, Alert $alert): JsonResponse
    {
        $this->authorize('view', $farm);

        abort_unless($alert->farm_id === $farm->id, 404);

        $alert->markAsRead();

        return response()->json([
            'id' => $alert->id,
            'isRead' => true,
            'unreadAlerts' => $farm->alerts()->where('is_read', false)->count(),
        ]);
    }

    /**
     * Marque toutes les alertes de l'exploitation comme lues.
     */
    public function markAllAlertsRead(Request $request, Farm $farm): JsonResponse
    {
        $this->authorize('view', $farm);

        $farm->alerts()
            ->where('is_read', false)
            ->get()
            ->each(fn (Alert $alert) => $alert->markAsRead());

        return response()->json([
            'isRead' => true,
            'unreadAlerts' => 0,
        ]);
    }
}
