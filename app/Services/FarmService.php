<?php

namespace App\Services;

use App\Models\Farm;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Agrège les données d'exploitation pour la page `/exploitations`.
 *
 * La page est hybride : l'administrateur global y supervise toutes les
 * exploitations, tout autre compte y retrouve la sienne. Le mode est décidé
 * ici, à partir du rôle, jamais d'un paramètre de requête — la portée
 * d'une exploitation est une décision serveur (RM-01).
 *
 * Comme pour le tableau de bord, le service renvoie des valeurs brutes et les
 * périodes qui les produisent ; libellés, tons et formats restent côté front.
 */
class FarmService
{
    private const CAMPAIGN_ROWS = 6;

    /**
     * Payload de la page `/exploitations` pour l'utilisateur connecté.
     *
     * @return array<string, mixed>
     */
    public function overviewFor(User $user): array
    {
        $context = [
            'user' => [
                'name' => $user->name,
                'role' => $user->role?->name,
                'initials' => $user->initials(),
            ],
            'generatedAt' => Carbon::now()->toIso8601String(),
        ];

        if ($user->isAdministrator()) {
            $farms = Farm::query()->orderBy('id')->get();

            return $context + [
                'mode' => 'list',
                'totals' => $this->totals($farms),
                'farms' => $farms->map(fn (Farm $farm) => $this->summary($farm))->all(),
            ];
        }

        // Un compte sans exploitation est un compte orphelin : `farm_id` a été
        // vidé. Aucune exploitation ne doit lui être attribuée au hasard.
        $farm = $user->farm;

        return $context + [
            'mode' => 'single',
            'farm' => $farm === null ? null : $this->detail($farm),
        ];
    }

    /**
     * Payload de la fiche d'une exploitation, après contrôle d'accès.
     *
     * @return array<string, mixed>
     */
    public function detailFor(User $user, Farm $farm): array
    {
        return [
            'mode' => 'single',
            'user' => [
                'name' => $user->name,
                'role' => $user->role?->name,
                'initials' => $user->initials(),
            ],
            'generatedAt' => Carbon::now()->toIso8601String(),
            'farm' => $this->detail($farm),
        ];
    }

    /**
     * Compteurs transversaux, présentés au-dessus de la liste.
     *
     * Les alertes non lues et la valeur du stock sont additionnés sans
     * conversion de devise : les montants sont homogènes dans le modèle.
     *
     * @param  Collection<int, Farm>  $farms
     * @return array<string, float|int>
     */
    private function totals($farms): array
    {
        $ids = $farms->modelKeys();

        $stockValue = DB::table('inputs')
            ->whereIn('farm_id', $ids)
            ->selectRaw('COALESCE(SUM(available_quantity * unit_price), 0) AS total')
            ->value('total');

        return [
            'farms' => $farms->count(),
            'users' => DB::table('users')->whereIn('farm_id', $ids)->count(),
            'plots' => DB::table('plots')->whereIn('farm_id', $ids)->count(),
            'plotsInCrop' => DB::table('plots')->whereIn('farm_id', $ids)->where('status', 'en_culture')->count(),
            'campaignsActive' => DB::table('campaigns')->whereIn('farm_id', $ids)->where('status', 'active')->count(),
            'stockValue' => (float) $stockValue,
            'unreadAlerts' => DB::table('alerts')->whereIn('farm_id', $ids)->where('is_read', false)->count(),
        ];
    }

    /**
     * Ligne de liste : l'essentiel pour comparer deux exploitations.
     *
     * @return array<string, mixed>
     */
    private function summary(Farm $farm): array
    {
        $now = Carbon::now();
        $monthStart = $now->copy()->startOfMonth()->toDateString();
        $monthEnd = $now->copy()->endOfMonth()->toDateString();

        $team = $farm->users()->get();
        $lastLogin = $team->max('last_login_at');

        return [
            'id' => $farm->id,
            'name' => $farm->name,
            'location' => $farm->location,
            'type' => $farm->type,
            'status' => $farm->status,
            'totalArea' => $this->totalAreaInHectares($farm),
            'manager' => $this->person($farm->manager),
            'team' => [
                'count' => $team->count(),
                'activeCount' => $team->filter(fn (User $member) => $member->isActive())->count(),
            ],
            'counts' => [
                'plots' => $farm->plots()->count(),
                'plotsInCrop' => $farm->plots()->where('status', 'en_culture')->count(),
                'campaigns' => $farm->campaigns()->count(),
                'campaignsActive' => $farm->campaigns()->where('status', 'active')->count(),
                'waterSources' => $farm->waterSources()->count(),
            ],
            'metrics' => [
                'waterAvailable' => $this->waterAvailable($farm),
                'stockValue' => (float) $farm->inputs()
                    ->selectRaw('COALESCE(SUM(available_quantity * unit_price), 0) AS total')
                    ->value('total'),
                'monthExpenses' => (float) $farm->expenses()
                    ->whereBetween('expense_date', [$monthStart, $monthEnd])
                    ->sum('amount'),
                'monthRevenues' => (float) $farm->revenues()
                    ->whereBetween('revenue_date', [$monthStart, $monthEnd])
                    ->sum('amount'),
            ],
            'unreadAlerts' => $farm->alerts()->where('is_read', false)->count(),
            'lastLoginAt' => $lastLogin?->toIso8601String(),
            'createdAt' => $farm->created_at?->toIso8601String(),
        ];
    }

    /**
     * Fiche complète : la ligne de liste augmentée de l'équipe et des campagnes
     * en cours, ce qui distingue une exploitation réellement suivie d'une
     * exploitation déclarée mais vide.
     *
     * @return array<string, mixed>
     */
    private function detail(Farm $farm): array
    {
        // `array_merge` et non `+` : l'union de tableaux PHP laisse gagner la
        // clé de gauche, ce qui conserverait le `team` résumé sans ses membres.
        return array_merge($this->summary($farm), [
            'team' => $this->team($farm),
            'plotStatuses' => $this->plotStatuses($farm),
            'campaigns' => $farm->campaigns()
                ->with(['crop:id,name,category', 'plot:id,code,name'])
                ->whereIn('status', ['active', 'planifiee', 'suspendue'])
                ->orderByRaw("CASE status WHEN 'active' THEN 0 WHEN 'planifiee' THEN 1 ELSE 2 END")
                ->orderByDesc('start_date')
                ->limit(self::CAMPAIGN_ROWS)
                ->get()
                ->map(fn ($campaign) => [
                    'id' => $campaign->id,
                    'name' => $campaign->name,
                    'code' => $campaign->code,
                    'status' => $campaign->status,
                    'cropName' => $campaign->crop?->name,
                    'cropCategory' => $campaign->crop?->category,
                    'plotCode' => $campaign->plot?->code,
                    'plotName' => $campaign->plot?->name,
                    // `campaigns.area` est en m² (colonne `surface_m2`, sans
                    // colonne d'unité) : la valeur est renvoyée telle quelle.
                    'area' => (float) $campaign->area,
                    'startDate' => $campaign->start_date->toIso8601String(),
                    'expectedEndDate' => $campaign->expected_end_date->toIso8601String(),
                ])
                ->all(),
        ];
    }

    /**
     * Équipe de l'exploitation, le responsable en tête.
     *
     * @return array<string, mixed>
     */
    private function team(Farm $farm): array
    {
        $members = $farm->users()
            ->with('role:id,name')
            ->orderByRaw('CASE WHEN id = ? THEN 0 ELSE 1 END', [$farm->manager_id])
            ->orderBy('name')
            ->get();

        return [
            'count' => $members->count(),
            'activeCount' => $members->filter(fn (User $member) => $member->isActive())->count(),
            'members' => $members
                ->map(fn (User $member) => $this->person($member) + [
                    'isActive' => $member->isActive(),
                    'isManager' => $member->id === $farm->manager_id,
                    'lastLoginAt' => $member->last_login_at?->toIso8601String(),
                ])
                ->all(),
        ];
    }

    /**
     * Répartition des parcelles par statut, pour distinguer une exploitation
     * en production d'une exploitation à l'arrêt.
     *
     * @return list<array{status: string, count: int}>
     */
    private function plotStatuses(Farm $farm): array
    {
        return $farm->plots()
            ->selectRaw('status, COUNT(*) AS count')
            ->groupBy('status')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => ['status' => $row->status, 'count' => (int) $row->count])
            ->all();
    }

    /**
     * Surface de l'exploitation, en hectares.
     *
     * `farms.total_area` fait foi, comme pour le tableau de bord. Le domaine de
     * la colonne est en réalité `surface_m2` alors que les valeurs saisies sont
     * des hectares : la conversion est donc univoque côté lecture, et le
     * correctif de schéma est suivi à part.
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

    /** Litres disponibles, les mètres cubes ramenés en litres. */
    private function waterAvailable(Farm $farm): float
    {
        return (float) $farm->waterSources()
            ->selectRaw("COALESCE(SUM(CASE WHEN unit = 'm3' THEN available_quantity * 1000 ELSE available_quantity END), 0) AS litres")
            ->value('litres');
    }

    /**
     * Fiche publique d'une personne : ni email, ni téléphone, ni identifiant de
     * rôle technique — le tableau de bord n'expose pas non plus de coordonnées.
     *
     * @return array<string, mixed>|null
     */
    private function person(?User $user): ?array
    {
        if ($user === null) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'role' => $user->role?->name,
            'initials' => $user->initials(),
        ];
    }
}
