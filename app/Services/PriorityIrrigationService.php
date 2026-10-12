<?php

namespace App\Services;

use App\Models\Farm;
use Illuminate\Support\Facades\DB;

/**
 * Priorisation des irrigations (CDC § 6.10).
 *
 * Le score est calculé en base par la vue `v_irrigation_priority` : jours depuis
 * la dernière irrigation, besoin en eau de la culture, priorité manuelle de la
 * parcelle et humidité du sol. Ce service ordonne simplement le résultat.
 */
class PriorityIrrigationService
{
    /**
     * Parcelles à irriguer en priorité pour une exploitation.
     *
     * @return list<array<string, mixed>>
     */
    public function forFarm(Farm $farm): array
    {
        return DB::table('v_irrigation_priority')
            ->where('farm_id', $farm->id)
            ->orderByDesc('priority_score')
            ->orderBy('plot_code')
            ->get()
            ->map(fn ($row) => [
                'plotId' => (int) $row->plot_id,
                'plotCode' => $row->plot_code,
                'plotName' => $row->plot_name,
                'plotStatus' => $row->plot_status,
                'manualPriority' => $row->manual_priority,
                'soilMoisture' => $row->soil_moisture === null ? null : (float) $row->soil_moisture,
                'cropId' => (int) $row->crop_id,
                'cropName' => $row->crop_name,
                'waterRequirement' => (float) $row->water_requirement,
                'lastIrrigationAt' => $row->last_irrigation_at,
                'daysSinceLastIrrigation' => (int) $row->days_since_last_irrigation,
                'priorityScore' => (float) $row->priority_score,
                'proposedPriority' => $row->proposed_priority,
            ])
            ->all();
    }
}
