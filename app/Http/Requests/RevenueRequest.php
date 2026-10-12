<?php

namespace App\Http\Requests;

use App\Models\Revenue;
use Illuminate\Validation\Rule;

class RevenueRequest extends ResourceRequest
{
    protected string $routeParameter = 'revenue';

    protected function modelClass(): string
    {
        return Revenue::class;
    }

    protected function baseRules(): array
    {
        return [
            'campaign_id' => ['nullable', 'integer', Rule::exists('campaigns', 'id')->where('farm_id', $this->farmId())],
            'harvest_id' => ['nullable', 'integer', Rule::exists('harvests', 'id')->where('farm_id', $this->farmId())],
            'revenue_date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'product' => ['nullable', 'string', 'max:150'],
            'quantity' => ['nullable', 'numeric', 'min:0.01'],
            'unit' => ['nullable', 'string', 'max:30'],
            'client' => ['nullable', 'string', 'max:255'],
            'comment' => ['nullable', 'string'],
        ];
    }
}
