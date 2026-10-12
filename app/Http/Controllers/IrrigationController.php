<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Requests\IrrigationRequest;
use App\Models\Irrigation;
use App\Models\User;
use App\Services\IrrigationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class IrrigationController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly IrrigationService $irrigations) {}

    public function index(Request $request): JsonResponse
    {
        $irrigations = Irrigation::query()
            ->with(['campaign:id,code,name', 'plot:id,code,name', 'waterSource:id,name,unit'])
            ->orderByDesc('performed_at')
            ->paginate($this->perPage($request));

        return $this->paginated($irrigations);
    }

    public function store(IrrigationRequest $request): JsonResponse
    {
        $irrigation = $this->irrigations->register($request->user(), $request->validated());

        return $this->created($irrigation, 'Irrigation enregistrée.');
    }

    public function show(Irrigation $irrigation): JsonResponse
    {
        return $this->respond($irrigation->load(['campaign:id,code,name', 'plot:id,code,name', 'waterSource:id,name,unit']));
    }

    public function update(IrrigationRequest $request, Irrigation $irrigation): JsonResponse
    {
        $this->authorize('update', $irrigation);

        $irrigation->fill($request->validated())->save();

        return $this->updated($irrigation, 'Irrigation mise à jour.');
    }

    public function destroy(Irrigation $irrigation): JsonResponse
    {
        $this->authorize('delete', $irrigation);

        // Une irrigation en attente peut être annulée ; une irrigation réalisée
        // est retracée dans le journal d'eau (append-only).
        $this->irrigations->cancel($irrigation, $request ?? auth()->user());

        return $this->deleted('Irrigation annulée.');
    }

    /** Valide une irrigation en attente (RM-10) : elle consomme alors son stock. */
    public function validate(Request $request, Irrigation $irrigation): JsonResponse
    {
        Gate::authorize('validate', $irrigation);

        $irrigation = $this->irrigations->validate($irrigation, $request->user());

        return $this->updated($irrigation, 'Irrigation validée.');
    }

    public function reject(Request $request, Irrigation $irrigation): JsonResponse
    {
        Gate::authorize('reject', $irrigation);

        $irrigation = $this->irrigations->reject($irrigation, $request->user());

        return $this->updated($irrigation, 'Irrigation refusée.');
    }

    public function cancel(Request $request, Irrigation $irrigation): JsonResponse
    {
        Gate::authorize('cancel', $irrigation);

        $irrigation = $this->irrigations->cancel($irrigation, $request->user());

        return $this->updated($irrigation, 'Irrigation annulée.');
    }
}