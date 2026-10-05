<?php

namespace App\Http\Controllers;

use App\Models\Farm;
use App\Services\FarmService;
use Illuminate\Contracts\View\View;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
}
