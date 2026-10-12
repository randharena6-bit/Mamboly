<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Requests\StockMovementRequest;
use App\Enums\StockMovementType;
use App\Models\InputStock;
use App\Models\StockMovement;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class StockMovementController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly StockService $stocks) {}

    public function index(Request $request): JsonResponse
    {
        $movements = StockMovement::query()
            ->with(['inputStock:id,name,unit', 'campaign:id,code'])
            ->orderByDesc('movement_date')
            ->paginate($this->perPage($request));

        return $this->paginated($movements);
    }

    /** Variation manuelle du stock d'un intrant (entrée, sortie, inventaire). */
    public function store(StockMovementRequest $request): JsonResponse
    {
        $input = InputStock::findOrFail($request->validated('input_id'));
        $this->authorize('update', $input);

        [$type, $delta] = $this->resolveDelta($request);
        $campaign = $request->validated('campaign_id') ? $request->validated('campaign_id') : null;

        $movement = $this->stocks->applyDelta(
            $input,
            $delta,
            $type,
            $request->user(),
            $campaign ? \App\Models\Campaign::find($campaign) : null,
            note: $request->validated('note'),
        );

        return response()->json(['message' => 'Mouvement de stock enregistré.', 'data' => $movement], 201);
    }

    public function show(StockMovement $stockMovement): JsonResponse
    {
        return $this->respond($stockMovement);
    }

    /**
     * Mouvements sur un intrant précis.
     */
    public function inputHistory(Request $request, InputStock $input): JsonResponse
    {
        $movements = $input->stockMovements()
            ->orderByDesc('movement_date')
            ->paginate($this->perPage($request));

        return $this->paginated($movements);
    }

    /**
     * @return array{0: string, 1: float}
     */
    private function resolveDelta(StockMovementRequest $request): array
    {
        $quantity = (float) $request->validated('quantity');
        $type = StockMovementType::from($request->validated('type'));
        $direction = $request->validated('direction');

        $incoming = $type->isIncoming();

        if ($incoming === null) {
            $incoming = match ($direction) {
                'entree' => true,
                'sortie' => false,
                default => null,
            };
        }

        if ($incoming === null) {
            throw ValidationException::withMessages([
                'direction' => 'Un sens est requis pour ce type de mouvement.',
            ]);
        }

        return [$type->value, $incoming ? $quantity : -$quantity];
    }
}