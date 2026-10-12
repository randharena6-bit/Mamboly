<?php

namespace App\Http\Controllers;

use App\Enums\WaterMovementType;
use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Requests\WaterMovementRequest;
use App\Models\WaterMovement;
use App\Models\WaterSource;
use App\Services\WaterStockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class WaterMovementController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly WaterStockService $water) {}

    public function index(Request $request): JsonResponse
    {
        $movements = WaterMovement::query()
            ->with(['waterSource:id,name,unit'])
            ->orderByDesc('movement_date')
            ->paginate($this->perPage($request));

        return $this->paginated($movements);
    }

    /** Variation manuelle du stock d'eau (remplissage, perte, vidange, correction). */
    public function store(WaterMovementRequest $request): JsonResponse
    {
        $source = WaterSource::findOrFail($request->validated('water_source_id'));

        $this->authorize('update', $source);
        $this->authorize('view', $source);

        [$type, $delta] = $this->resolveDelta($request);

        $movement = $this->water->applyDelta(
            $source,
            $delta,
            $type,
            $request->user(),
            note: $request->validated('note'),
        );

        return response()->json(['message' => 'Mouvement d’eau enregistré.', 'data' => $movement], 201);
    }

    public function show(WaterMovement $waterMovement): JsonResponse
    {
        return $this->respond($waterMovement);
    }

    /**
     * Mouvements sur une ressource précise.
     */
    public function sourceHistory(Request $request, WaterSource $waterSource): JsonResponse
    {
        $movements = $waterSource->waterMovements()
            ->orderByDesc('movement_date')
            ->paginate($this->perPage($request));

        return $this->paginated($movements);
    }

    /**
     * Détermine le type de mouvement et le delta signé à appliquer.
     *
     * @return array{0: string, 1: float}
     */
    private function resolveDelta(WaterMovementRequest $request): array
    {
        $quantity = (float) $request->validated('quantity');
        $direction = $request->validated('direction');

        $type = WaterMovementType::from($request->validated('type'));

        // Les types ambigus (correction, ajustement, transfert) s'appuient sur
        // `direction` ; les autres portent leur sens intrinsèque.
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
}