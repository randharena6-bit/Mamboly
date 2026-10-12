<?php

namespace App\Services;

use App\Models\Farm;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Indicateurs financiers d'une exploitation.
 *
 * Marge simplifiée = recettes - dépenses (CDC § 9). Les agrégats sont calculés
 * en base et bornés à une exploitation, jamais renvoyés par le client.
 */
class FinanceService
{
    /**
     * Synthèse sur une période optionnelle.
     *
     * @return array{from: string|null, to: string|null, expenses: float, revenues: float, margin: float}
     */
    public function summary(Farm $farm, ?Carbon $from = null, ?Carbon $to = null): array
    {
        $expenses = (float) $farm->expenses()
            ->when($from, fn ($q) => $q->whereDate('expense_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('expense_date', '<=', $to))
            ->sum('amount');

        $revenues = (float) $farm->revenues()
            ->when($from, fn ($q) => $q->whereDate('revenue_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('revenue_date', '<=', $to))
            ->sum('amount');

        return [
            'from' => $from?->toDateString(),
            'to' => $to?->toDateString(),
            'expenses' => round($expenses, 2),
            'revenues' => round($revenues, 2),
            'margin' => round($revenues - $expenses, 2),
        ];
    }

    /**
     * Dépenses agrégées par catégorie, les plus lourdes d'abord.
     *
     * @return list<array{category: string, total: float}>
     */
    public function expensesByCategory(Farm $farm, ?Carbon $from = null, ?Carbon $to = null): array
    {
        return $farm->expenses()
            ->selectRaw('category, SUM(amount) AS total')
            ->when($from, fn ($q) => $q->whereDate('expense_date', '>=', $from))
            ->when($to, fn ($q) => $q->whereDate('expense_date', '<=', $to))
            ->groupBy('category')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => ['category' => $row->category, 'total' => (float) $row->total])
            ->all();
    }

    /**
     * Marge par campagne : recettes et dépenses rattachées à chaque campagne.
     *
     * @return list<array<string, mixed>>
     */
    public function byCampaign(Farm $farm): array
    {
        $expenses = DB::table('expenses')
            ->selectRaw('campaign_id, SUM(amount) AS total')
            ->where('farm_id', $farm->id)
            ->whereNotNull('campaign_id')
            ->groupBy('campaign_id')
            ->pluck('total', 'campaign_id');

        $revenues = DB::table('revenues')
            ->selectRaw('campaign_id, SUM(amount) AS total')
            ->where('farm_id', $farm->id)
            ->whereNotNull('campaign_id')
            ->groupBy('campaign_id')
            ->pluck('total', 'campaign_id');

        return $farm->campaigns()
            ->with(['crop:id,name', 'plot:id,code'])
            ->orderByDesc('start_date')
            ->get()
            ->map(function ($campaign) use ($expenses, $revenues) {
                $expense = (float) ($expenses[$campaign->id] ?? 0);
                $revenue = (float) ($revenues[$campaign->id] ?? 0);

                return [
                    'campaignId' => $campaign->id,
                    'code' => $campaign->code,
                    'name' => $campaign->name,
                    'cropName' => $campaign->crop?->name,
                    'plotCode' => $campaign->plot?->code,
                    'status' => $campaign->status,
                    'expenses' => round($expense, 2),
                    'revenues' => round($revenue, 2),
                    'margin' => round($revenue - $expense, 2),
                ];
            })
            ->all();
    }
}
