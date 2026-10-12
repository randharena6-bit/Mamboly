<?php

namespace App\Http\Requests;

use App\Enums\CampaignStatus;
use App\Models\Campaign;
use Illuminate\Validation\Rule;

class CampaignRequest extends ResourceRequest
{
    protected string $routeParameter = 'campaign';

    protected function modelClass(): string
    {
        return Campaign::class;
    }

    protected function baseRules(): array
    {
        return [
            'plot_id' => ['required', 'integer', Rule::exists('plots', 'id')->where('farm_id', $this->farmId())],
            'crop_id' => ['required', 'integer', 'exists:crops,id'],
            'manager_id' => ['nullable', 'integer', 'exists:users,id'],
            'code' => ['nullable', 'string', 'max:60', $this->uniquePerFarm('campaigns', 'code')],
            'name' => ['required', 'string', 'max:150'],
            'start_date' => ['required', 'date'],
            'expected_end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'actual_end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'area' => ['required', 'numeric', 'min:0.01'],
            'status' => ['nullable', Rule::enum(CampaignStatus::class)],
            'notes' => ['nullable', 'string'],
        ];
    }
}
