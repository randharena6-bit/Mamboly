<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IrrigationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campaignId' => $this->campaign_id,
            'plotId' => $this->plot_id,
            'waterSourceId' => $this->water_source_id,
            'quantity' => (float) $this->quantity,
            'unit' => $this->unit,
            'method' => $this->method,
            'status' => $this->status,
            'scheduledAt' => $this->scheduled_at?.toIso8601String(),
            'performedAt' => $this->performed_at?->toIso8601String(),
            'durationMinutes' => $this->duration_minutes,
            'performedBy' => $this->performed_by,
            'validatedBy' => $this->validated_by,
            'observation' => $this->observation,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}