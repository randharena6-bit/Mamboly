<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Réponses JSON homogènes pour les ressources de l'application web.
 *
 * Le front React consomme ces points d'entrée sous la session courante ; la
 * pagination est bornée côté serveur pour éviter toute lecture massive.
 */
trait RespondsWithJson
{
    /** Nombre d'éléments par page, borné à [1, 200]. */
    protected function perPage(Request $request): int
    {
        return max(1, min($request->integer('per_page', 50), 200));
    }

    protected function respond(mixed $data, int $status = 200): JsonResponse
    {
        return response()->json($data, $status);
    }

    protected function paginated(LengthAwarePaginator $paginator): JsonResponse
    {
        return response()->json($paginator);
    }

    protected function created(Model $model, string $message): JsonResponse
    {
        return response()->json(['message' => $message, 'data' => $model], 201);
    }

    protected function updated(Model $model, string $message): JsonResponse
    {
        return response()->json(['message' => $message, 'data' => $model]);
    }

    protected function deleted(string $message): JsonResponse
    {
        return response()->json(['message' => $message]);
    }
}
