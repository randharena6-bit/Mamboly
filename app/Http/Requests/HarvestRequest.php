<?php

namespace App\Http\Requests;

use App\Models\Harvest;
use Illuminate\Validation\Rule;

class HarvestRequest extends ResourceRequest
{
    protected string $routeParameter = 'harvest';

    protected function modelClass(): string
    {
        return Harvest::class;
    }

    protected function baseRules(): array
    {
        return [
            'campaign_id' => ['required', 'integer', Rule::exists('campaigns', 'id')->where('farm_id', $this->farmId())],
            'plot_id' => ['required', 'integer', Rule::exists('plots', 'id')->where('farm_id', $this->farmId())],
            'product' => ['required', 'string', 'max:150'],
            'harvest_date' => ['required', 'date'],
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'unit' => ['required', 'string', 'max:30'],
            'quality' => ['nullable', 'string', 'max:50'],
            'loss_quantity' => ['nullable', 'numeric', 'min:0', 'lt:quantity'],
            'observation' => ['nullable', 'string'],
        ];
    }
}
