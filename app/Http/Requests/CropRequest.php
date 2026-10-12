<?php

namespace App\Http\Requests;

use App\Enums\CropStatus;
use App\Models\Crop;
use Illuminate\Validation\Rule;

class CropRequest extends ResourceRequest
{
    protected string $routeParameter = 'crop';

    protected function modelClass(): string
    {
        return Crop::class;
    }

    protected function baseRules(): array
    {
        $unique = Rule::unique('crops', 'name');

        $crop = $this->routeModel();

        if ($crop !== null) {
            $unique->ignore($crop->getKey());
        }

        return [
            'name' => ['required', 'string', 'max:150', $unique],
            'category' => ['required', 'string', 'max:100'],
            'estimated_duration_days' => ['required', 'integer', 'min:1'],
            'water_requirement' => ['required', 'numeric', 'min:0'],
            'production_unit' => ['required', 'string', 'max:30'],
            'status' => ['nullable', Rule::enum(CropStatus::class)],
        ];
    }
}
