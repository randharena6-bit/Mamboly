<?php

namespace App\Http\Requests;

use App\Enums\AreaUnit;
use App\Enums\PlotStatus;
use App\Enums\PriorityLevel;
use App\Models\Plot;
use Illuminate\Validation\Rule;

class PlotRequest extends ResourceRequest
{
    protected string $routeParameter = 'plot';

    protected function modelClass(): string
    {
        return Plot::class;
    }

    protected function baseRules(): array
    {
        return [
            'code' => ['required', 'string', 'max:50', $this->uniquePerFarm('plots', 'code')],
            'name' => ['required', 'string', 'max:150'],
            'area' => ['required', 'numeric', 'min:0.01'],
            'area_unit' => ['required', Rule::enum(AreaUnit::class)],
            'location' => ['nullable', 'string', 'max:255'],
            'soil_type' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::enum(PlotStatus::class)],
            'manual_priority' => ['nullable', Rule::enum(PriorityLevel::class)],
            'soil_moisture' => ['nullable', 'numeric', 'between:0,100'],
        ];
    }
}
