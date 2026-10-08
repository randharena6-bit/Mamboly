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

    /** Activités récentes affichées dans l'onglet « Activités ». */
    private const ACTIVITY_ROWS = 8;

    /**
     * Plafond de la liste d'alertes de la fiche : les alertes non lues sont
     * toujours en tête, et « Tout marquer lu » agit côté serveur sur la
     * totalité de l'exploitation, jamais sur cette sélection.
     */
    private const ALERT_ROWS = 100;

    /** Humidité du sol (en %) sous laquelle une parcelle est considérée à risque. */
    private const SOIL_MOISTURE_RISK = 25.0;

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
            // Décision d'interface portée par le serveur : la création et la
            // suppression d'une exploitation sont réservées à l'administrateur
            // global, jamais décidées côté client (RM-01).
            'canManage' => $user->isAdministrator(),
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
            'canManage' => $user->isAdministrator(),
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
     * Fiche complète : la ligne de liste augmentée de l'équipe, des campagnes
     * en cours, des parcelles, des stocks, de l'eau, des alertes détaillées et
     * des activités récentes — ce qui distingue une exploitation réellement
     * suivie d'une exploitation déclarée mais vide.
     *
     * @return array<string, mixed>
     */
    private function detail(Farm $farm): array
    {
        $plots = $this->plots($farm);
        $waterSources = $this->waterSources($farm);

        // `array_merge` et non `+` : l'union de tableaux PHP laisse gagner la
        // clé de gauche, ce qui conserverait le `team` résumé sans ses membres.
        return array_merge($this->summary($farm), [
            'team' => $this->team($farm),
            'plotStatuses' => $this->plotStatuses($farm),
            'campaigns' => $this->campaigns($farm),
            'plots' => $plots,
            'plotsAtRisk' => count(array_filter($plots, fn (array $plot) => $plot['isAtRisk'])),
            'criticalInputs' => $this->criticalInputs($farm),
            'waterSources' => $waterSources,
            'waterSummary' => $this->waterSummary($waterSources),
            'alerts' => $this->alerts($farm),
            'activities' => $this->activities($farm),
        ]);
    }

    /**
     * Parcelles de l'exploitation, chacune accompagnée de sa campagne active
     * lorsqu'elle en a une : une parcelle « en culture » sans campagne ouverte
     * est un signe de saisie incomplète.
     *
     * @return list<array<string, mixed>>
     */
    private function plots(Farm $farm): array
    {
        $activeCampaigns = $farm->campaigns()
            ->where('status', 'active')
            ->orderByDesc('start_date')
            ->get()
            ->groupBy('plot_id');

        return $farm->plots()
            ->orderBy('code')
            ->get()
            ->map(function ($plot) use ($activeCampaigns) {
                // Une parcelle sans campagne active n'a pas de groupe : le
                // `?->` évite `->first()` sur une collection inexistante.
                $campaign = $activeCampaigns->get($plot->id)?->first();
                $moisture = $plot->soil_moisture;

                return [
                    'id' => $plot->id,
                    'code' => $plot->code,
                    'name' => $plot->name,
                    'location' => $plot->location,
                    'soilType' => $plot->soil_type,
                    'status' => $plot->status,
                    'area' => (float) $plot->area,
                    'areaUnit' => $plot->area_unit,
                    // Surface normalisée : le tableau mélange m² et hectares.
                    'areaHa' => round($plot->areaInHectares(), 3),
                    'soilMoisture' => $moisture === null ? null : (float) $moisture,
                    'manualPriority' => $plot->manual_priority,
                    'isAtRisk' => $plot->manual_priority === 'critique'
                        || ($moisture !== null && (float) $moisture < self::SOIL_MOISTURE_RISK),
                    'activeCampaign' => $campaign === null ? null : [
                        'id' => $campaign->id,
                        'name' => $campaign->name,
                        'code' => $campaign->code,
                        'startDate' => $campaign->start_date?->toIso8601String(),
                    ],
                ];
            })
            ->all();
    }

    /**
     * Campagnes en cours, planifiées ou suspendues : les campagnes terminées
     * et annulées restent consultables ailleurs, elles n'occupent pas la fiche.
     *
     * @return list<array<string, mixed>>
     */
    private function campaigns(Farm $farm): array
    {
        return $farm->campaigns()
            ->with(['crop:id,name,category', 'plot:id,code,name'])
            ->whereIn('status', ['active', 'planifiee', 'suspendue'])
            ->orderByRaw("CASE status WHEN 'active' THEN 0 WHEN 'planifiee' THEN 1 ELSE 2 END")
            ->orderByDesc('start_date')
            ->limit(self::CAMPAIGN_ROWS)
            ->get()
            ->map(function ($campaign) {
                return [
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
                    'startDate' => $campaign->start_date?->toIso8601String(),
                    'expectedEndDate' => $campaign->expected_end_date?->toIso8601String(),
                ];
            })
            ->all();
    }

    /**
     * Intrants sous le seuil minimal : `available_quantity < minimum_threshold`.
     *
     * La valeur de chaque ligne (`quantity * unit_price`) permet d'estimer
     * immédiatement le coût du réapprovisionnement.
     *
     * @return list<array<string, mixed>>
     */
    private function criticalInputs(Farm $farm): array
    {
        return $farm->inputs()
            ->whereColumn('available_quantity', '<', 'minimum_threshold')
            ->orderByRaw('available_quantity / NULLIF(minimum_threshold, 0) ASC')
            ->orderBy('name')
            ->get()
            ->map(fn ($input) => [
                'id' => $input->id,
                'name' => $input->name,
                'category' => $input->category,
                'unit' => $input->unit,
                'quantity' => (float) $input->available_quantity,
                'threshold' => (float) $input->minimum_threshold,
                'unitPrice' => (float) $input->unit_price,
                'value' => $input->stockValue(),
                'supplier' => $input->supplier,
            ])
            ->all();
    }

    /**
     * Ressources en eau, la plus basse d'abord, avec taux de remplissage et
     * position par rapport au seuil critique.
     *
     * @return list<array<string, mixed>>
     */
    private function waterSources(Farm $farm): array
    {
        return $farm->waterSources()
            ->orderByRaw('available_quantity / NULLIF(capacity, 0) ASC')
            ->orderBy('name')
            ->get()
            ->map(fn ($source) => [
                'id' => $source->id,
                'name' => $source->name,
                'type' => $source->type,
                'location' => $source->location,
                'status' => $source->status,
                'unit' => $source->unit,
                'available' => (float) $source->available_quantity,
                'capacity' => (float) $source->capacity,
                'threshold' => (float) $source->critical_threshold,
                'fillRatio' => round($source->fillRatio(), 1),
                'isCritical' => $source->isBelowThreshold(),
            ])
            ->all();
    }

    /**
     * Agrégats de la ressource en eau : les volumes de sources hétérogènes
     * (litres, m³) sont ramenés en litres, comme `metrics.waterAvailable`.
     *
     * @param  list<array<string, mixed>>  $sources
     * @return array<string, float|int>
     */
    private function waterSummary(array $sources): array
    {
        $toLitres = fn (array $source): float => $source['unit'] === 'm3'
            ? $source['available'] * 1000
            : $source['available'];
        $capacityToLitres = fn (array $source): float => $source['unit'] === 'm3'
            ? $source['capacity'] * 1000
            : $source['capacity'];

        $available = (float) array_sum(array_map($toLitres, $sources));
        $capacity = (float) array_sum(array_map($capacityToLitres, $sources));

        return [
            'sourceCount' => count($sources),
            'availableLitres' => $available,
            'capacityLitres' => $capacity,
            'fillRatio' => $capacity > 0.0 ? round(($available / $capacity) * 100, 1) : 0.0,
            'criticalCount' => count(array_filter($sources, fn (array $source) => $source['isCritical'])),
        ];
    }

    /**
     * Alertes de l'exploitation, non lues d'abord, chacune rattachée à son
     * objet (point d'eau, intrant ou campagne) : la cible est portée par le
     * serveur, le client n'a pas à résoudre les identifiants.
     *
     * @return list<array<string, mixed>>
     */
    private function alerts(Farm $farm): array
    {
        return $farm->alerts()
            ->with([
                'waterSource:id,name',
                'inputStock:id,name',
                'campaign:id,name',
            ])
            ->orderBy('is_read')
            ->orderByDesc('created_at')
            ->limit(self::ALERT_ROWS)
            ->get()
            ->map(fn ($alert) => [
                'id' => $alert->id,
                'type' => $alert->type,
                'severity' => $alert->severity,
                'title' => $alert->title,
                'message' => $alert->message,
                'isRead' => $alert->is_read,
                'createdAt' => $alert->created_at->toIso8601String(),
                'target' => [
                    'kind' => match (true) {
                        $alert->water_source_id !== null => 'water_source',
                        $alert->input_id !== null => 'input',
                        default => 'campaign',
                    },
                    'label' => $alert->waterSource?->name
                        ?? $alert->inputStock?->name
                        ?? $alert->campaign?->name,
                ],
            ])
            ->all();
    }

    /**
     * Activités récentes de l'exploitation, les plus récentes d'abord.
     *
     * @return list<array<string, mixed>>
     */
    private function activities(Farm $farm): array
    {
        return $farm->activities()
            ->with(['plot:id,code,name', 'campaign:id,name'])
            ->orderByDesc('activity_date')
            ->orderByDesc('id')
            ->limit(self::ACTIVITY_ROWS)
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
