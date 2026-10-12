<?php

namespace App\Http\Requests;

use App\Enums\ExpenseCategory;
use App\Models\Expense;
use Illuminate\Validation\Rule;

class ExpenseRequest extends ResourceRequest
{
    protected string $routeParameter = 'expense';

    protected function modelClass(): string
    {
        return Expense::class;
    }

    protected function baseRules(): array
    {
        return [
            'campaign_id' => ['nullable', 'integer', Rule::exists('campaigns', 'id')->where('farm_id', $this->farmId())],
            'expense_date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'category' => ['required', Rule::enum(ExpenseCategory::class)],
            'description' => ['nullable', 'string'],
            'receipt_path' => ['nullable', 'string', 'max:255'],
        ];
    }
}
