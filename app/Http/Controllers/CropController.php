<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Requests\CropRequest;
use App\Models\Crop;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CropController extends Controller
{
    use RespondsWithJson;

    public function index(Request $request): JsonResponse
    {
        $crops = Crop::query()
            ->orderBy('name')
            ->paginate($this->perPage($request));

        return $this->paginated($crops);
    }

    public function store(CropRequest $request): JsonResponse
    {
        return $this->created(Crop::create($request->validated()), 'Culture créée.');
    }

    public function show(Crop $crop): JsonResponse
    {
        return $this->respond($crop);
    }

    public function update(CropRequest $request, Crop $crop): JsonResponse
    {
        $crop->update($request->validated());

        return $this->updated($crop, 'Culture mise à jour.');
    }

    public function destroy(Crop $crop): JsonResponse
    {
        Gate::authorize('delete', $crop);

        $crop->delete();

        return $this->deleted('Culture supprimée.');
    }
}
