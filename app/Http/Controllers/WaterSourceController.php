<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Requests\WaterSourceRequest;
use App\Models\WaterSource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WaterSourceController extends Controller
{
    use RespondsWithJson;

    public function index(Request $request): JsonResponse
    {
        $sources = WaterSource::query()
            ->orderBy('name')
            ->paginate($this->perPage($request));

        return $this->paginated($sources);
    }

    public function store(WaterSourceRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['farm_id'] = $request->user()->farm_id;

        $source = WaterSource::create($data);

        return $this->created($source, 'Ressource en eau créée.');
    }

    public function show(WaterSource $waterSource): JsonResponse
    {
        return $this->respond($waterSource);
    }

    public function update(WaterSourceRequest $request, WaterSource $waterSource): JsonResponse
    {
        // `available_quantity` n'est jamais modifié directement : il ne peut
        // évoluer que par un mouvement d'eau traçable (RM-09).
        $waterSource->update($request->safe()->except('available_quantity'));

        return $this->updated($waterSource, 'Ressource en eau mise à jour.');
    }

    public function destroy(WaterSource $waterSource): JsonResponse
    {
        $waterSource->delete();

        return $this->deleted('Ressource en eau supprimée.');
    }
}
