<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Concerns\ServesModulePages;
use App\Http\Requests\HarvestRequest;
use App\Models\Harvest;
use Illuminate\Contracts\View\View;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HarvestController extends Controller
{
    use RespondsWithJson;
    use ServesModulePages;

    public function index(Request $request): View|JsonResponse
    {
        if (! $request->expectsJson()) {
            return $this->moduleView('harvests', 'Récoltes');
        }

        $harvests = Harvest::query()
            ->with(['campaign:id,code,name', 'plot:id,code,name'])
            ->orderByDesc('harvest_date')
            ->paginate($this->perPage($request));

        return $this->paginated($harvests);
    }

    public function store(HarvestRequest $request): JsonResponse
    {
        $harvest = Harvest::create($request->validated() + ['farm_id' => $request->user()->farm_id, 'user_id' => $request->user()->id]);

        return $this->created($harvest, 'Récolte enregistrée.');
    }

    public function show(Harvest $harvest): JsonResponse
    {
        return $this->respond($harvest);
    }

    public function update(HarvestRequest $request, Harvest $harvest): JsonResponse
    {
        $harvest->update($request->validated());

        return $this->updated($harvest, 'Récolte mise à jour.');
    }

    public function destroy(Harvest $harvest): JsonResponse
    {
        $harvest->delete();

        return $this->deleted('Récolte supprimée.');
    }
}
