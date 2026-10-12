<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Concerns\ServesModulePages;
use App\Http\Requests\PlotRequest;
use App\Models\Plot;
use Illuminate\Contracts\View\View;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlotController extends Controller
{
    use RespondsWithJson;
    use ServesModulePages;

    public function index(Request $request): View|JsonResponse
    {
        if (! $request->expectsJson()) {
            return $this->moduleView('plots', 'Parcelles');
        }

        $plots = Plot::query()
            ->with('farm:id,name')
            ->orderBy('code')
            ->paginate($this->perPage($request));

        return $this->paginated($plots);
    }

    public function store(PlotRequest $request): JsonResponse
    {
        $plot = Plot::create($request->validated() + ['farm_id' => $request->user()->farm_id]);

        return $this->created($plot, 'Parcelle créée.');
    }

    public function show(Plot $plot): JsonResponse
    {
        return $this->respond($plot->load('farm:id,name'));
    }

    public function update(PlotRequest $request, Plot $plot): JsonResponse
    {
        $plot->update($request->validated());

        return $this->updated($plot, 'Parcelle mise à jour.');
    }

    public function destroy(Plot $plot): JsonResponse
    {
        $plot->delete();

        return $this->deleted('Parcelle supprimée.');
    }
}
