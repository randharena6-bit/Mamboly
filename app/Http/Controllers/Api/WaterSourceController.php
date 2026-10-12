<?php

namespace App\Http\Controllers\Api;

use App\Enums\WaterMovementType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\WaterMovementRequest;
use App\Http\Resources\WaterMovementResource;
use App\Http\Resources\WaterSourceResource;
use App\Models\WaterSource;
use App\Services\WaterStockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

/**
 * Ressources en eau et journal des mouvements (API jetons).
 */
class WaterSourceController extends Controller
{
    public function __construct(private readonly WaterStockService $water) {}

    public function index(Request $request): JsonResponse
    {
        $sources = WaterSource::query()
            ->orderBy('name')
            ->paginate($this->perPage($request));

        return WaterSourceResource::collection($sources)->response();
    }

    public function show(WaterSource $waterSource): JsonResponse
    {
        Gate::authorize('view', $waterSource);

        return (new WaterSourceResource($waterSource))->response();
    }

    public function movements(Request $request, WaterSource $waterSource): JsonResponse
    {
        Gate::authorize('view', $waterSource);

        $movements = $waterSource->waterMovements()
            ->orderByDesc('movement_date')
            ->paginate($this->perPage($request));

        return WaterMovementResource::collection($movements)->response();
    }

    /** Applique une variation manuelle au stock de la ressource. */
    public function applyMovement(WaterMovementRequest $request, WaterSource $waterSource): JsonResponse
    {
        Gate::authorize('update', $waterSource);

        [$type, $delta] = $this->resolveDelta($request);

        $movement = $this->water->applyDelta(
            $waterSource,
            $delta,
            $type,
            $request->user(),
            note: $request->validated('note'),
        );

        return response()->json([
            'message' => 'Mouvement d’eau enregistré.',
            'data' => new WaterMovementResource($movement),
            'waterSource' => new WaterSourceResource($waterSource->refresh()),
        ], 201);
    }

    /** @return array{0: string, 1: float} */
    private function resolveDelta(WaterMovementRequest $request): array
    {
        $quantity = (float) $request->validated('quantity');
        $direction = $request->validated('direction');
        $type = WaterMovementType::from($request->validated('type'));

        $ambiguous = in_array($type, [
            WaterMovementType::Correction,
            WaterMovementType::Ajustement,
            WaterMovementType::Transfert,
        ], true);

        if ($ambiguous) {
            if (! in_array($direction, ['entree', 'sortie'], true)) {
                throw ValidationException::withMessages([
                    'direction' => 'Précisez le sens (entree ou sortie) pour ce type de mouvement.',
                ]);
            }

            $incoming = $direction === 'entree';
        } else {
            $incoming = $type->isIncoming();
        }

        return [$type->value, $incoming ? $quantity : -$quantity];
    }

    private function perPage(Request $request): int
    {
        return max(1, min($request->integer('per_page', 50), 200));
    }
}