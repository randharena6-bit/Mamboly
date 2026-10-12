<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WaterSourceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type,
            'capacity' => (float) $this->capacity,
            'availableQuantity' => (float) $this->available_quantity,
            'unit' => $this->unit,
            'criticalThreshold' => $this->critical_threshold === null ? null : (float) $this->critical_threshold,
            'location' => $this->location,
            'status' => $this->status,
            'farmId' => $this->farm_id,
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
