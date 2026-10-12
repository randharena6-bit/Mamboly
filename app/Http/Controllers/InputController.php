<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Requests\InputRequest;
use App\Models\InputStock;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InputController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly StockService $stocks) {}

    public function index(Request $request): JsonResponse
    {
        $inputs = InputStock::query()
            ->withCount('stockMovements')
            ->orderBy('name')
            ->paginate($this->perPage($request));

        return $this->paginated($inputs);
    }

    public function store(InputRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['farm_id'] = $request->user()->farm_id;

        // Le stock initial est géré comme un mouvement d'entrée pour garder un
        // historique complet ; la colonne est pilotée par le service.
        $initial = $data['initial_quantity'] ?? 0;
        unset($data['initial_quantity']);
        $data['available_quantity'] = 0;

        $input = InputStock::create($data);

        if ($initial > 0) {
            $this->stocks->receive($input, (float) $initial, $request->user(), type: 'entree', note: 'Stock initial');
        }

        return $this->created($input->refresh(), 'Intrant créé.');
    }

    public function show(InputStock $input): JsonResponse
    {
        return $this->respond($input);
    }

    public function update(InputRequest $request, InputStock $input): JsonResponse
    {
        // `available_quantity` évolue uniquement par mouvements traçables.
        $input->update($request->safe()->except(['available_quantity', 'initial_quantity']));

        return $this->updated($input, 'Intrant mis à jour.');
    }

    public function destroy(InputStock $input): JsonResponse
    {
        $input->delete();

        return $this->deleted('Intrant supprimé.');
    }
}
