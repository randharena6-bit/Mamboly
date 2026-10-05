<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Illuminate\Contracts\View\View;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Tableau de bord de l'exploitation courante.
 *
 * La page et sa ressource JSON partagent le même service : le rendu HTML sert
 * l'îlot React, qui appelle `/dashboard/data` pour charger les chiffres. Le
 * cloisonnement par exploitation est appliqué côté serveur, à partir de
 * `users.farm_id`, jamais d'un paramètre de requête.
 */
class DashboardController extends Controller
{
    public function __construct(private readonly DashboardService $dashboard) {}

    public function show(Request $request): View
    {
        return view('dashboard', [
            'user' => $request->user()->only(['name', 'email']),
            'dataUrl' => route('dashboard.data'),
        ]);
    }

    public function data(Request $request): JsonResponse
    {
        return response()->json($this->dashboard->forUser($request->user()));
    }
}
