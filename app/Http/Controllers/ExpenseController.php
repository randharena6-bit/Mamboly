<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Concerns\ServesModulePages;
use App\Http\Requests\ExpenseRequest;
use App\Models\Expense;
use Illuminate\Contracts\View\View;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    use RespondsWithJson;
    use ServesModulePages;

    public function index(Request $request): View|JsonResponse
    {
        if (! $request->expectsJson()) {
            return $this->moduleView('expenses', 'Dépenses');
        }

        $expenses = Expense::query()
            ->with('campaign:id,code,name')
            ->orderByDesc('expense_date')
            ->paginate($this->perPage($request));

        return $this->paginated($expenses);
    }

    public function store(ExpenseRequest $request): JsonResponse
    {
        $expense = Expense::create($request->validated() + [
            'farm_id' => $request->user()->farm_id,
            'user_id' => $request->user()->id,
        ]);

        return $this->created($expense, 'Dépense enregistrée.');
    }

    public function show(Expense $expense): JsonResponse
    {
        return $this->respond($expense);
    }

    public function update(ExpenseRequest $request, Expense $expense): JsonResponse
    {
        $expense->update($request->validated());

        return $this->updated($expense, 'Dépense mise à jour.');
    }

    public function destroy(Expense $expense): JsonResponse
    {
        $expense->delete();

        return $this->deleted('Dépense supprimée.');
    }
}
