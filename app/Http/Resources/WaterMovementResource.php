<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WaterMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'waterSourceId' => $this->water_source_id,
            'campaignId' => $this->campaign_id,
            'irrigationId' => $this->irrigation_id,
            'type' => $this->type,
            'quantity' => (float) $this->quantity,
            'quantityBefore' => (float) $this->quantity_before,
            'quantityAfter' => (float) $this->quantity_after,
            'movementDate' => $this->movement_date?->toIso8601String(),
            'note' => $this->note,
        ];
    }
}
