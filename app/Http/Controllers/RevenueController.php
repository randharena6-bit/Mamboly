<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Requests\RevenueRequest;
use App\Models\Revenue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RevenueController extends Controller
{
    use RespondsWithJson;

    public function index(Request $request): JsonResponse
    {
        $revenues = Revenue::query()
            ->with('campaign:id,code,name')
            ->orderByDesc('revenue_date')
            ->paginate($this->perPage($request));

        return $this->paginated($revenues);
    }

    public function store(RevenueRequest $request): JsonResponse
    {
        $revenue = Revenue::create($request->validated() + [
            'farm_id' => $request->user()->farm_id,
            'user_id' => $request->user()->id,
        ]);

        return $this->created($revenue, 'Recette enregistrée.');
    }

    public function show(Revenue $revenue): JsonResponse
    {
        return $this->respond($revenue);
    }

    public function update(RevenueRequest $request, Revenue $revenue): JsonResponse
    {
        $revenue->update($request->validated());

        return $this->updated($revenue, 'Recette mise à jour.');
    }

    public function destroy(Revenue $revenue): JsonResponse
    {
        $revenue->delete();

        return $this->deleted('Recette supprimée.');
    }
}