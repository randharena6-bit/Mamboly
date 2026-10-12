<?php

namespace App\Http\Requests;

use App\Enums\WaterSourceStatus;
use App\Enums\WaterSourceType;
use App\Enums\WaterUnit;
use App\Models\WaterSource;
use Illuminate\Validation\Rule;

class WaterSourceRequest extends ResourceRequest
{
    protected string $routeParameter = 'waterSource';

    protected function modelClass(): string
    {
        return WaterSource::class;
    }

    protected function baseRules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150', $this->uniquePerFarm('water_sources', 'name')],
            'type' => ['required', Rule::enum(WaterSourceType::class)],
            'capacity' => ['required', 'numeric', 'min:0.01'],
            'available_quantity' => ['nullable', 'numeric', 'min:0', 'lte:capacity'],
            'unit' => ['nullable', Rule::enum(WaterUnit::class)],
            'critical_threshold' => ['nullable', 'numeric', 'min:0', 'lte:capacity'],
            'location' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::enum(WaterSourceStatus::class)],
        ];
    }
}
