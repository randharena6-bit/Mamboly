<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Models\Farm;
use App\Services\PriorityIrrigationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class PriorityIrrigationController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly PriorityIrrigationService $priority) {}

    public function index(Request $request): JsonResponse
    {
        $farm = $request->user()->farm;

        if ($farm === null) {
            abort_if($request->missing('farm_id'), 422, 'Sélectionnez une exploitation.');
            $farm = Farm::findOrFail($request->integer('farm_id'));
        }

        Gate::authorize('view', $farm);

        return $this->respond(['priority' => $this->priority->forFarm($farm)]);
    }
}