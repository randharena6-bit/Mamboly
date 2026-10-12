<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlotResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'area' => (float) $this->area,
            'areaUnit' => $this->area_unit,
            'location' => $this->location,
            'soilType' => $this->soil_type,
            'status' => $this->status,
            'manualPriority' => $this->manual_priority,
            'soilMoisture' => $this->soil_moisture === null ? null : (float) $this->soil_moisture,
            'farmId' => $this->farm_id,
        ];
    }
}