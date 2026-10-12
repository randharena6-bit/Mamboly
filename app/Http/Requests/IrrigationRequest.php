<?php

namespace App\Http\Requests;

use App\Enums\IrrigationMethod;
use App\Enums\IrrigationStatus;
use App\Enums\WaterUnit;
use App\Models\Irrigation;
use Illuminate\Validation\Rule;

class IrrigationRequest extends ResourceRequest
{
    protected string $routeParameter = 'irrigation';

    protected function modelClass(): string
    {
        return Irrigation::class;
    }

    protected function baseRules(): array
    {
        return [
            'campaign_id' => ['required', 'integer', Rule::exists('campaigns', 'id')->where('farm_id', $this->farmId())],
            'plot_id' => ['required', 'integer', Rule::exists('plots', 'id')->where('farm_id', $this->farmId())],
            'water_source_id' => ['required', 'integer', Rule::exists('water_sources', 'id')->where('farm_id', $this->farmId())],
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'unit' => ['nullable', Rule::enum(WaterUnit::class)],
            'duration_minutes' => ['nullable', 'integer', 'min:1'],
            'method' => ['required', Rule::enum(IrrigationMethod::class)],
            'status' => ['nullable', Rule::enum(IrrigationStatus::class)],
            'scheduled_at' => ['nullable', 'date'],
            'performed_at' => ['nullable', 'date'],
            'observation' => ['nullable', 'string'],
        ];
    }
}
