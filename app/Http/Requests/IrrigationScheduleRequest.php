<?php

namespace App\Http\Requests;

use App\Enums\PriorityLevel;
use App\Enums\ScheduleStatus;
use App\Models\IrrigationSchedule;
use Illuminate\Validation\Rule;

class IrrigationScheduleRequest extends ResourceRequest
{
    protected string $routeParameter = 'schedule';

    protected function modelClass(): string
    {
        return IrrigationSchedule::class;
    }

    protected function baseRules(): array
    {
        return [
            'campaign_id' => ['required', 'integer', Rule::exists('campaigns', 'id')->where('farm_id', $this->farmId())],
            'plot_id' => ['required', 'integer', Rule::exists('plots', 'id')->where('farm_id', $this->farmId())],
            'water_source_id' => ['required', 'integer', Rule::exists('water_sources', 'id')->where('farm_id', $this->farmId())],
            'agent_id' => ['required', 'integer', Rule::exists('users', 'id')->where('farm_id', $this->farmId())],
            'scheduled_date' => ['required', 'date'],
            'scheduled_time' => ['nullable', 'date_format:H:i'],
            'estimated_quantity' => ['required', 'numeric', 'min:0.01'],
            'priority' => ['nullable', Rule::enum(PriorityLevel::class)],
            'status' => ['nullable', Rule::enum(ScheduleStatus::class)],
            'comment' => ['nullable', 'string'],
        ];
    }
}
