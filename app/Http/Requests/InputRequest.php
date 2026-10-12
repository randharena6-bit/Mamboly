<?php

namespace App\Http\Requests;

use App\Enums\InputCategory;
use App\Enums\InputStatus;
use App\Models\InputStock;
use Illuminate\Validation\Rule;

class InputRequest extends ResourceRequest
{
    protected string $routeParameter = 'input';

    protected function modelClass(): string
    {
        return InputStock::class;
    }

    protected function baseRules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150', $this->uniquePerFarm('inputs', 'name')],
            'category' => ['required', Rule::enum(InputCategory::class)],
            'unit' => ['required', 'string', 'max:30'],
            'minimum_threshold' => ['nullable', 'numeric', 'min:0'],
            'unit_price' => ['nullable', 'numeric', 'min:0'],
            'supplier' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::enum(InputStatus::class)],
            'initial_quantity' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
