<?php

namespace App\Services;

use App\Models\Farm;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReportService
{
    private const MONTH_LABELS = [
        1 => 'Jan', 2 => 'Fév', 3 => 'Mar', 4 => 'Avr',
        5 => 'Mai', 6 => 'Juin', 7 => 'Juil', 8 => 'Août',
        9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Déc',
    ];

    public function forUser(User $user): array
    {
        $farm = $this->resolveFarm($user);
        $now = Carbon::now();

        $campaign = $farm->campaigns()->where('status', 'en_cours')->first();
        $campaignStart = $campaign?->start_date ? Carbon::parse($campaign->start_date) : $now->copy()->startOfYear();
        $campaignEnd = $campaign?->end_date ? Carbon::parse($campaign->end_date) : $now;

        $totalAreaHa = $this->totalAreaInHectares($farm);

        $expensesTotal = (float) $farm->expenses()
            ->whereBetween('expense_date', [$campaignStart->toDateString(), $campaignEnd->toDateString()])
            ->sum('amount');

        $revenuesTotal = (float) $farm->revenues()
            ->whereBetween('revenue_date', [$campaignStart->toDateString(), $campaignEnd->toDateString()])
            ->sum('amount');

        $waterLitres = (float) $farm->irrigations()
            ->whereNotNull('performed_at')
            ->whereBetween('performed_at', [$campaignStart, $campaignEnd])
            ->selectRaw('COALESCE(SUM(CASE WHEN unit = \'m3\' THEN quantity * 1000 ELSE quantity END), 0) AS litres')
            ->value('litres');

        $harvestQty = (float) $farm->harvests()
            ->whereBetween('harvest_date', [$campaignStart->toDateString(), $campaignEnd->toDateString()])
            ->sum('quantity');

        $plotsByStatus = $farm->plots()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->get()
            ->map(fn ($row) => ['status' => $row->status, 'count' => (int) $row->total])
            ->values()
            ->all();

        $crops = $farm->plots()
            ->with(['crop:id,name,cycle_duration_days'])
            ->whereNotNull('crop_id')
            ->get()
            ->groupBy('crop_id')
            ->map(fn ($group) => [
                'crop' => $group->first()->crop?->name ?? '—',
                'count' => $group->count(),
                'area' => round($group->sum(fn ($plot) => $plot->areaInHectares()), 2),
            ])
            ->values()
            ->all();

        $irrigationsByMonth = $this->irrigationsByMonth($farm, $campaignStart, $campaignEnd);
        $cashflowByMonth = $this->cashflowByMonth($farm, $campaignStart, $campaignEnd);
        $expensesByCategory = $this->expensesByCategory($farm, $campaignStart, $campaignEnd);
        $topPlots = $this->topPlots($farm, $campaignStart, $campaignEnd);
        $stock = $this->stockSummary($farm);
        $waterSources = $this->waterSources($farm);
        $recentActivities = $this->recentActivities($farm);
        $alerts = $this->alerts($farm);

        return [
            'farm' => [
                'id' => $farm->id,
                'name' => $farm->name,
                'location' => $farm->location,
                'type' => $farm->type,
                'totalArea' => round($totalAreaHa, 2),
            ],
            'campaign' => $campaign ? [
                'id' => $campaign->id,
                'name' => $campaign->name,
                'start_date' => $campaign->start_date?->toDateString(),
                'end_date' => $campaign->end_date?->toDateString(),
                'status' => $campaign->status,
            ] : null,
            'period' => [
                'from' => $campaignStart->toDateString(),
                'to' => $campaignEnd->toDateString(),
            ],
            'kpis' => [
                ['id' => 'surface', 'label' => 'Surface totale', 'value' => round($totalAreaHa, 2), 'unit' => 'ha'],
                ['id' => 'parcelles', 'label' => 'Parcelles', 'value' => $farm->plots()->count(), 'unit' => ''],
                ['id' => 'depenses', 'label' => 'Dépenses (campagne)', 'value' => round($expensesTotal, 0), 'unit' => 'Ar'],
                ['id' => 'recettes', 'label' => 'Recettes (campagne)', 'value' => round($revenuesTotal, 0), 'unit' => 'Ar'],
                ['id' => 'solde', 'label' => 'Solde (campagne)', 'value' => round($revenuesTotal - $expensesTotal, 0), 'unit' => 'Ar'],
                ['id' => 'eau', 'label' => 'Eau irriguée', 'value' => round($waterLitres, 0), 'unit' => 'L'],
                ['id' => 'recoltes', 'label' => 'Récoltes', 'value' => round($harvestQty, 2), 'unit' => 'kg'],
            ],
            'plotsByStatus' => $plotsByStatus,
            'crops' => $crops,
            'irrigationsByMonth' => $irrigationsByMonth,
            'cashflowByMonth' => $cashflowByMonth,
            'expensesByCategory' => $expensesByCategory,
            'topPlots' => $topPlots,
            'stock' => $stock,
            'waterSources' => $waterSources,
            'recentActivities' => $recentActivities,
            'alerts' => $alerts,
            'generatedAt' => $now->toIso8601String(),
        ];
    }

    private function resolveFarm(User $user): Farm
    {
        return $user->farm
            ?? Farm::query()->where('status', 'active')->orderBy('id')->firstOrFail();
    }

    private function totalAreaInHectares(Farm $farm): float
    {
        $declared = (float) $farm->total_area;

        if ($declared > 0.0) {
            return $declared;
        }

        return (float) $farm->plots()->get()->sum(fn ($plot) => $plot->areaInHectares());
    }

    private function irrigationsByMonth(Farm $farm, Carbon $start, Carbon $end): array
    {
        $rows = DB::table('irrigations')
            ->selectRaw("to_char(performed_at, 'YYYY-MM') as month_key")
            ->selectRaw('COUNT(*) as count')
            ->selectRaw('COALESCE(SUM(CASE WHEN unit = \'m3\' THEN quantity * 1000 ELSE quantity END), 0) as litres')
            ->where('farm_id', $farm->id)
            ->whereNotNull('performed_at')
            ->whereBetween('performed_at', [$start, $end])
            ->groupBy('month_key')
            ->orderBy('month_key')
            ->get();

        return $rows->map(function ($row) {
            $date = Carbon::createFromFormat('Y-m', $row->month_key);
            return [
                'month' => $row->month_key,
                'label' => self::MONTH_LABELS[$date->month],
                'count' => (int) $row->count,
                'litres' => (float) $row->litres,
            ];
        })->all();
    }

    private function cashflowByMonth(Farm $farm, Carbon $start, Carbon $end): array
    {
        $expenses = DB::table('expenses')
            ->selectRaw("to_char(expense_date, 'YYYY-MM') as month_key")
            ->selectRaw('COALESCE(SUM(amount), 0) as total')
            ->where('farm_id', $farm->id)
            ->whereBetween('expense_date', [$start->toDateString(), $end->toDateString()])
            ->groupBy('month_key')
            ->pluck('total', 'month_key');

        $revenues = DB::table('revenues')
            ->selectRaw("to_char(revenue_date, 'YYYY-MM') as month_key")
            ->selectRaw('COALESCE(SUM(amount), 0) as total')
            ->where('farm_id', $farm->id)
            ->whereBetween('revenue_date', [$start->toDateString(), $end->toDateString()])
            ->groupBy('month_key')
            ->pluck('total', 'month_key');

        $months = collect($expenses->keys())->merge($revenues->keys())->unique()->sort()->values();

        return $months->map(function ($key) use ($expenses, $revenues) {
            $date = Carbon::createFromFormat('Y-m', $key);
            $dep = (float) ($expenses[$key] ?? 0);
            $rec = (float) ($revenues[$key] ?? 0);
            return [
                'month' => $key,
                'label' => self::MONTH_LABELS[$date->month],
                'expenses' => $dep,
                'revenues' => $rec,
                'balance' => $rec - $dep,
            ];
        })->all();
    }

    private function expensesByCategory(Farm $farm, Carbon $start, Carbon $end): array
    {
        return $farm->expenses()
            ->selectRaw('category, COALESCE(SUM(amount), 0) as total')
            ->whereBetween('expense_date', [$start->toDateString(), $end->toDateString()])
            ->groupBy('category')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => ['category' => $row->category ?: 'Autre', 'amount' => (float) $row->total])
            ->values()
            ->all();
    }

    private function topPlots(Farm $farm, Carbon $start, Carbon $end): array
    {
        $plotExpenses = DB::table('expenses')
            ->selectRaw('plot_id, COALESCE(SUM(amount), 0) as total')
            ->where('farm_id', $farm->id)
            ->whereNotNull('plot_id')
            ->whereBetween('expense_date', [$start->toDateString(), $end->toDateString()])
            ->groupBy('plot_id')
            ->pluck('total', 'plot_id');

        $plotRevenues = DB::table('revenues')
            ->selectRaw('plot_id, COALESCE(SUM(amount), 0) as total')
            ->where('farm_id', $farm->id)
            ->whereNotNull('plot_id')
            ->whereBetween('revenue_date', [$start->toDateString(), $end->toDateString()])
            ->groupBy('plot_id')
            ->pluck('total', 'plot_id');

        $plotWater = DB::table('irrigations')
            ->selectRaw('plot_id, COUNT(*) as count, COALESCE(SUM(CASE WHEN unit = \'m3\' THEN quantity * 1000 ELSE quantity END), 0) as litres')
            ->where('farm_id', $farm->id)
            ->whereNotNull('plot_id')
            ->whereNotNull('performed_at')
            ->whereBetween('performed_at', [$start, $end])
            ->groupBy('plot_id')
            ->get()
            ->keyBy('plot_id');

        $plots = $farm->plots()->with('crop')->get();

        $items = $plots->map(function ($plot) use ($plotExpenses, $plotRevenues, $plotWater) {
            $exp = (float) ($plotExpenses[$plot->id] ?? 0);
            $rec = (float) ($plotRevenues[$plot->id] ?? 0);
            $water = $plotWater->get($plot->id);
            return [
                'id' => $plot->id,
                'code' => $plot->code,
                'name' => $plot->name,
                'status' => $plot->status,
                'crop' => $plot->crop?->name,
                'area' => round($plot->areaInHectares(), 2),
                'expenses' => $exp,
                'revenues' => $rec,
                'balance' => $rec - $exp,
                'irrigations' => $water ? (int) $water->count : 0,
                'waterLitres' => $water ? (float) $water->litres : 0.0,
            ];
        })->sortByDesc('balance')->values();

        return $items->all();
    }

    private function stockSummary(Farm $farm): array
    {
        return $farm->inputs()
            ->orderByRaw('available_quantity * COALESCE(unit_price,0) DESC')
            ->limit(10)
            ->get()
            ->map(fn ($input) => [
                'id' => $input->id,
                'name' => $input->name,
                'category' => $input->category,
                'quantity' => (float) $input->available_quantity,
                'unit' => $input->unit,
                'threshold' => (float) $input->minimum_threshold,
                'unitPrice' => (float) $input->unit_price,
                'value' => round((float) $input->available_quantity * (float) $input->unit_price, 2),
                'low' => (float) $input->available_quantity <= (float) $input->minimum_threshold && (float) $input->minimum_threshold > 0,
            ])
            ->all();
    }

    private function waterSources(Farm $farm): array
    {
        return $farm->waterSources()
            ->get()
            ->map(fn ($source) => [
                'id' => $source->id,
                'name' => $source->name,
                'type' => $source->type,
                'available' => (float) $source->available_quantity,
                'capacity' => (float) $source->capacity,
                'unit' => $source->unit,
                'threshold' => (float) $source->critical_threshold,
                'ratio' => $source->capacity > 0 ? round(((float) $source->available_quantity / (float) $source->capacity) * 100, 1) : null,
            ])
            ->all();
    }

    private function recentActivities(Farm $farm): array
    {
        return $farm->activities()
            ->with(['plot:id,code,name'])
            ->orderByDesc('activity_date')
            ->orderByDesc('id')
            ->limit(8)
            ->get()
            ->map(fn ($activity) => [
                'id' => $activity->id,
                'type' => $activity->type,
                'description' => $activity->description,
                'cost' => $activity->cost,
                'date' => $activity->activity_date?->toDateString(),
                'plot' => $activity->plot?->code,
            ])
            ->all();
    }

    private function alerts(Farm $farm): array
    {
        return $farm->alerts()
            ->orderByDesc('created_at')
            ->limit(6)
            ->get()
            ->map(fn ($alert) => [
                'id' => $alert->id,
                'severity' => $alert->severity,
                'type' => $alert->type,
                'title' => $alert->title,
                'message' => $alert->message,
                'isRead' => $alert->is_read,
                'createdAt' => $alert->created_at->toIso8601String(),
            ])
            ->all();
    }
}
