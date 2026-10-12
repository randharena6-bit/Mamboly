<?php

namespace App\Http\Requests;

use App\Enums\ActivityType;
use App\Models\Activity;
use Illuminate\Validation\Rule;

class ActivityRequest extends ResourceRequest
{
    protected string $routeParameter = 'activity';

    protected function modelClass(): string
    {
        return Activity::class;
    }

    protected function baseRules(): array
    {
        return [
            'plot_id' => ['required', 'integer', Rule::exists('plots', 'id')->where('farm_id', $this->farmId())],
            'campaign_id' => ['nullable', 'integer', Rule::exists('campaigns', 'id')->where('farm_id', $this->farmId())],
            'type' => ['required', Rule::enum(ActivityType::class)],
            'activity_date' => ['required', 'date'],
            'description' => ['nullable', 'string'],
            'cost' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
