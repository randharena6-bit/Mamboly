<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\IrrigationRequest;
use App\Http\Resources\IrrigationResource;
use App\Models\Irrigation;
use App\Services\IrrigationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Cycle de vie des irrigations (API jetons).
 */
class IrrigationController extends Controller
{
    public function __construct(private readonly IrrigationService $irrigations) {}

    public function index(Request $request): JsonResponse
    {
        $irrigations = Irrigation::query()
            ->orderByDesc('performed_at')
            ->paginate($this->perPage($request));

        return IrrigationResource::collection($irrigations)->response();
    }

    public function store(IrrigationRequest $request): JsonResponse
    {
        $irrigation = $this->irrigations->register($request->user(), $request->validated());

        return response()->json([
            'message' => 'Irrigation enregistrée.',
            'data' => new IrrigationResource($irrigation),
        ], 201);
    }

    public function show(Irrigation $irrigation): JsonResponse
    {
        Gate::authorize('view', $irrigation);

        return (new IrrigationResource($irrigation))->response();
    }

    public function validate(Request $request, Irrigation $irrigation): JsonResponse
    {
        Gate::authorize('validate', $irrigation);

        $irrigation = $this->irrigations->validate($irrigation, $request->user());

        return response()->json(['message' => 'Irrigation validée.', 'data' => new IrrigationResource($irrigation)]);
    }

    public function reject(Request $request, Irrigation $irrigation): JsonResponse
    {
        Gate::authorize('reject', $irrigation);

        $irrigation = $this->irrigations->reject($irrigation, $request->user());

        return response()->json(['message' => 'Irrigation refusée.', 'data' => new IrrigationResource($irrigation)]);
    }

    public function cancel(Request $request, Irrigation $irrigation): JsonResponse
    {
        Gate::authorize('cancel', $irrigation);

        $irrigation = $this->irrigations->cancel($irrigation, $request->user());

        return response()->json(['message' => 'Irrigation annulée.', 'data' => new IrrigationResource($irrigation)]);
    }

    private function perPage(Request $request): int
    {
        return max(1, min($request->integer('per_page', 50), 200));
    }
}