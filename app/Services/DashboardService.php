<?php

namespace App\Services;

use App\Models\Farm;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Agrège les données d'une exploitation pour alimenter le tableau de bord.
 *
 * Toutes les requêtes sont bornées à un `farm_id` : le cloisonnement
 * multi-exploitations (RM-01) ne dépend pas du client. Les libellés, tons et
 * formats restent côté front : le service renvoie des valeurs brutes et la
 * période qui les produced, pour que la présentation reste localisable.
 */
class DashboardService
{
    /** Nombre de mois de la courbe de consommation d'eau (campagne + référence N-1). */
    private const WATER_MONTHS = 12;

    /** Fenêtre de la fenêtre "6 derniers mois" des flux de trésorerie. */
    private const CASHFLOW_MONTHS = 6;

    private const RECENT_ACTIVITIES = 6;

    private const STOCK_ROWS = 6;

    private const ALERT_ROWS = 5;

    private const EXPENSE_SLICES = 4;

    /** Libellés courts des mois, dans l'ordre attendu par les graphiques. */
    private const MONTH_LABELS = [
        1 => 'Jan', 2 => 'Fév', 3 => 'Mar', 4 => 'Avr',
        5 => 'Mai', 6 => 'Juin', 7 => 'Juil', 8 => 'Août',
        9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Déc',
    ];

    /**
     * Construit le payload du tableau de bord pour l'utilisateur connecté.
     *
     * @return array{farm: array<string, mixed>, user: array<string, mixed>, generatedAt: string, stats: list<array<string, mixed>>, water: list<array<string, mixed>>, cashflow: list<array<string, mixed>>, expenseBreakdown: list<array<string, mixed>>, stock: list<array<string, mixed>>, activities: list<array<string, mixed>>, alerts: list<array<string, mixed>>, waterSources: list<array<string, mixed>>, unreadAlerts: int}
     */
    public function forUser(User $user): array
    {
        $farm = $this->resolveFarm($user);
        $now = Carbon::now();
        $anchor = $now->copy()->startOfMonth();

        return [
            'farm' => [
                'id' => $farm->id,
                'name' => $farm->name,
                'location' => $farm->location,
                'type' => $farm->type,
                'status' => $farm->status,
                'totalArea' => $this->totalAreaInHectares($farm),
                'plotsInCropCount' => $farm->plots()->where('status', 'en_culture')->count(),
                'plotsCount' => $farm->plots()->count(),
                'campaignsCount' => $farm->campaigns()->count(),
            ],
            'user' => [
                'name' => $user->name,
                'role' => $user->role?->name,
                'initials' => $this->initials($user->name),
            ],
            'generatedAt' => $now->toIso8601String(),
            'stats' => $this->stats($farm, $now),
            'water' => $this->waterSeries($farm, $anchor),
            'cashflow' => $this->cashflowSeries($farm, $anchor),
            'expenseBreakdown' => $this->expenseBreakdown($farm, $now),
            'stock' => $this->stock($farm),
            'activities' => $this->recentActivities($farm),
            'alerts' => $this->alerts($farm),
            'waterSources' => $this->waterSources($farm),
            'unreadAlerts' => $farm->alerts()->where('is_read', false)->count(),
        ];
    }

    /**
     * L'utilisateur appartient à une exploitation ; l'administrateur global
     * (`users.farm_id` nul) retombe sur la première exploitation active afin que
     * le tableau de bord reste consultable sans ouvrir une portée transverse.
     */
    private function resolveFarm(User $user): Farm
    {
        return $user->farm
            ?? Farm::query()->where('status', 'active')->orderBy('id')->firstOrFail();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function stats(Farm $farm, Carbon $now): array
    {
        $monthStart = $now->copy()->startOfMonth();
        $previousStart = $now->copy()->subMonthNoOverflow()->startOfMonth();

        $expensesNow = (float) $farm->expenses()
            ->whereBetween('expense_date', [$monthStart->toDateString(), $monthStart->copy()->endOfMonth()->toDateString()])
            ->sum('amount');
        $expensesBefore = (float) $farm->expenses()
            ->whereBetween('expense_date', [$previousStart->toDateString(), $monthStart->copy()->subDay()->toDateString()])
            ->sum('amount');

        $waterNow = $this->litresBetween($farm, $monthStart, $monthStart->copy()->endOfMonth());
        $waterBefore = $this->litresBetween($farm, $previousStart, $previousStart->copy()->endOfMonth());

        $plotsCount = $farm->plots()->count();
        $inputsCount = $farm->inputs()->count();

        return [
            [
                'id' => 'surface',
                'label' => 'Surface totale',
                'value' => $this->totalAreaInHectares($farm),
                'unit' => 'ha',
                'hint' => $plotsCount.' '.($plotsCount > 1 ? 'parcelles suivies' : 'parcelle suivie'),
            ],
            [
                'id' => 'stock',
                'label' => 'Valeur du stock',
                'value' => (float) $farm->inputs()
                    ->selectRaw('COALESCE(SUM(available_quantity * unit_price), 0) AS total')
                    ->value('total'),
                'unit' => 'M Ar',
                'hint' => $inputsCount.' '.($inputsCount > 1 ? 'intrants suivis' : 'intrant suivi'),
            ],
            [
                'id' => 'depenses',
                'label' => 'Dépenses du mois',
                'value' => $expensesNow,
                'unit' => 'Ar',
                'delta' => $this->variation($expensesNow, $expensesBefore),
                'favourableWhen' => 'down',
                'hint' => $now->translatedFormat('F Y'),
            ],
            [
                'id' => 'eau',
                'label' => 'Eau consommée',
                'value' => $waterNow,
                'unit' => 'L',
                'delta' => $this->variation($waterNow, $waterBefore),
                'favourableWhen' => 'down',
                'hint' => $now->translatedFormat('F Y'),
            ],
        ];
    }

    /**
     * Surface de l'exploitation, en hectares.
     *
     * `farms.total_area` fait foi : c'est la surface déclarée de
     * l'exploitation. La somme des parcelles ne sert que de repli lorsque la
     * valeur déclarée est absente, le temps que la saisie soit complète.
     */
    private function totalAreaInHectares(Farm $farm): float
    {
        $declared = (float) $farm->total_area;

        if ($declared > 0.0) {
            return round($declared, 2);
        }

        return round((float) $farm->plots()->get()->sum(
            fn ($plot) => $plot->areaInHectares()
        ), 2);
    }

    /**
     * Consommation d'eau par mois sur la campagne, avec la même période N-1
     * comme référence lorsque des irrigations existent. Les mois sans aucune
     * donnée sont retirés des deux extrémités : une courbe ne doit pas
     * présenter de plateau à zéro comme s'il s'agissait d'une mesure.
     *
     * @return list<array<string, mixed>>
     */
    private function waterSeries(Farm $farm, Carbon $anchor): array
    {
        $window = $anchor->copy()->subMonthsNoOverflow(self::WATER_MONTHS + 11);

        $totals = DB::table('irrigations')
            ->selectRaw("date_trunc('month', performed_at) AS bucket")
            ->selectRaw('SUM(CASE WHEN unit = \'m3\' THEN quantity * 1000 ELSE quantity END) AS litres')
            ->where('farm_id', $farm->id)
            ->where('performed_at', '>=', $window->startOfMonth())
            ->groupBy(DB::raw("date_trunc('month', performed_at)"))
            ->get()
            ->mapWithKeys(fn ($row) => [
                Carbon::parse($row->bucket)->format('Y-m') => (float) $row->litres,
            ])
            ->all();

        $months = [];
        for ($offset = self::WATER_MONTHS - 1; $offset >= 0; $offset--) {
            $month = $anchor->copy()->subMonthsNoOverflow($offset);
            $key = $month->format('Y-m');

            $months[] = [
                'month' => $key,
                'label' => self::MONTH_LABELS[$month->month],
                'consumption' => $totals[$key] ?? 0.0,
                'reference' => $totals[$month->copy()->subYear()->format('Y-m')] ?? null,
            ];
        }

        return $this->trimEmptyMonths($months);
    }

    /**
     * Dépenses et recettes par mois sur les six derniers mois.
     *
     * @return list<array<string, mixed>>
     */
    private function cashflowSeries(Farm $farm, Carbon $anchor): array
    {
        $window = $anchor->copy()->subMonthsNoOverflow(self::CASHFLOW_MONTHS - 1)->startOfMonth();

        $expenses = $this->monthlyTotals('expenses', 'expense_date', $farm, $window);
        $revenues = $this->monthlyTotals('revenues', 'revenue_date', $farm, $window);

        $points = [];
        for ($offset = self::CASHFLOW_MONTHS - 1; $offset >= 0; $offset--) {
            $month = $anchor->copy()->subMonthsNoOverflow($offset);
            $key = $month->format('Y-m');

            $points[] = [
                'month' => $key,
                'label' => self::MONTH_LABELS[$month->month],
                'expenses' => $expenses[$key] ?? 0.0,
                'revenues' => $revenues[$key] ?? 0.0,
            ];
        }

        return $points;
    }

    /**
     * Sommes mensuelles indexées par `Y-m`, toutes unités de devise confondues.
     *
     * @return array<string, float>
     */
    private function monthlyTotals(string $table, string $dateColumn, Farm $farm, Carbon $window): array
    {
        return DB::table($table)
            ->selectRaw("date_trunc('month', {$dateColumn}) AS bucket, SUM(amount) AS total")
            ->where('farm_id', $farm->id)
            ->where($dateColumn, '>=', $window->toDateString())
            ->groupBy(DB::raw("date_trunc('month', {$dateColumn})"))
            ->get()
            ->mapWithKeys(fn ($row) => [
                Carbon::parse($row->bucket)->format('Y-m') => (float) $row->total,
            ])
            ->all();
    }

    /**
     * Répartition des dépenses du mois par catégorie, les catégories mineures
     * étant regroupées pour que l'anneau reste lisible.
     *
     * Le mois est borné à ses extrémités et non à l'instant présent : une
     * dépense saisie en cours de mois doit compter dans le total du mois, et
     * la comparaison avec le mois précédent reste ainsi à périmètre égal.
     *
     * @return list<array<string, mixed>>
     */
    private function expenseBreakdown(Farm $farm, Carbon $now): array
    {
        $rows = $farm->expenses()
            ->selectRaw('category, SUM(amount) AS total')
            ->whereBetween('expense_date', [
                $now->copy()->startOfMonth()->toDateString(),
                $now->copy()->endOfMonth()->toDateString(),
            ])
            ->groupBy('category')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => ['name' => $row->category, 'value' => (float) $row->total])
            ->values();

        if ($rows->count() <= self::EXPENSE_SLICES) {
            return $rows->all();
        }

        $slices = $rows->take(self::EXPENSE_SLICES - 1);
        $slices->push([
            'name' => 'Autres',
            'value' => round((float) $rows->slice(self::EXPENSE_SLICES - 1)->sum('value'), 2),
        ]);

        return $slices->all();
    }

    /**
     * Intrants les plus valorisés ; le panneau d'alertes recalcule le seuil en
     * front, la ligne ne porte donc pas de statut.
     *
     * @return list<array<string, mixed>>
     */
    private function stock(Farm $farm): array
    {
        return $farm->inputs()
            ->orderByRaw('available_quantity * unit_price DESC')
            ->limit(self::STOCK_ROWS)
            ->get()
            ->map(fn ($input) => [
                'id' => $input->id,
                'name' => $input->name,
                'category' => $input->category,
                'quantity' => (float) $input->available_quantity,
                'unit' => $input->unit,
                'threshold' => (float) $input->minimum_threshold,
                'unitPrice' => (float) $input->unit_price,
                'supplier' => $input->supplier,
            ])
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function recentActivities(Farm $farm): array
    {
        return $farm->activities()
            ->with(['plot:id,code,name', 'campaign:id,name'])
            ->orderByDesc('activity_date')
            ->orderByDesc('id')
            ->limit(self::RECENT_ACTIVITIES)
            ->get()
            ->map(fn ($activity) => [
                'id' => $activity->id,
                'type' => $activity->type,
                'description' => $activity->description,
                'cost' => $activity->cost,
                'date' => $activity->activity_date->toIso8601String(),
                'plotCode' => $activity->plot?->code,
                'plotName' => $activity->plot?->name,
                'campaignName' => $activity->campaign?->name,
            ])
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function alerts(Farm $farm): array
    {
        return $farm->alerts()
            ->orderBy('is_read')
            ->orderByDesc('created_at')
            ->limit(self::ALERT_ROWS)
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

    /**
     * Ressources en eau, les plus basses d'abord : c'est l'information que le
     * responsable cherche en premier.
     *
     * @return list<array<string, mixed>>
     */
    private function waterSources(Farm $farm): array
    {
        return $farm->waterSources()
            ->orderByRaw('capacity * CASE WHEN capacity > 0 THEN available_quantity / capacity ELSE 1 END ASC')
            ->get()
            ->map(fn ($source) => [
                'id' => $source->id,
                'name' => $source->name,
                'type' => $source->type,
                'available' => (float) $source->available_quantity,
                'capacity' => (float) $source->capacity,
                'unit' => $source->unit,
                'threshold' => (float) $source->critical_threshold,
            ])
            ->all();
    }

    /**
     * Litres consommés entre deux instants, toutes unités confondues.
     */
    private function litresBetween(Farm $farm, Carbon $from, Carbon $to): float
    {
        return (float) $farm->irrigations()
            ->whereBetween('performed_at', [$from, $to])
            ->selectRaw('COALESCE(SUM(CASE WHEN unit = \'m3\' THEN quantity * 1000 ELSE quantity END), 0) AS litres')
            ->value('litres');
    }

    /**
     * Écart en pourcentage entre deux périodes. Sans base comparable, aucun
     * delta n'est renvoyé : afficher « +100 % » sur une période vide induirait
     * en erreur.
     */
    private function variation(float $current, float $previous): ?float
    {
        if ($previous <= 0.0) {
            return $current > 0.0 ? null : 0.0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    /**
     * Supprime les mois sans aucune donnée aux deux extrémités de la série.
     *
     * @param  list<array<string, mixed>>  $months
     * @return list<array<string, mixed>>
     */
    private function trimEmptyMonths(array $months): array
    {
        $filled = array_values(array_filter(
            $months,
            fn (array $month) => $month['consumption'] > 0.0 || ($month['reference'] ?? 0.0) > 0.0
        ));

        return $filled === $months ? $months : $filled;
    }

    private function initials(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name)) ?: [];

        return mb_strtoupper(mb_substr((string) ($parts[0] ?? ''), 0, 1).mb_substr((string) (end($parts) ?: ''), 0, 1));
    }
}
