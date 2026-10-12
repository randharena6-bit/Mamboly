<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CampaignResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'plotId' => $this->plot_id,
            'cropId' => $this->crop_id,
            'managerId' => $this->manager_id,
            'startDate' => $this->start_date?->toDateString(),
            'expectedEndDate' => $this->expected_end_date?->toDateString(),
            'actualEndDate' => $this->actual_end_date?->toDateString(),
            'area' => (float) $this->area,
            'status' => $this->status,
            'notes' => $this->notes,
        ];
    }
}
