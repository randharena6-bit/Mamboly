import { Bell, ChartPie, Droplets, LayoutDashboard, MapPin, Package, Sprout, Wallet } from 'lucide-react';
import { useMemo } from 'react';

import {
    activeFarm,
    cashflow,
    currentUser,
    expenseBreakdown,
    heroStats,
    recentActivities,
    alerts,
    stockRows,
    waterConsumptionYear,
    waterSources,
} from '../../data/mock';
import { formatNumber } from '../../lib/format';
import {
    ChartSkeleton,
    EmptyState,
    ErrorState,
    ListSkeleton,
    StatCardSkeleton,
} from '../landing/states';
import { InfoTooltip } from '../ui/tooltip';
import { CashflowBarChart, ChartCard, ExpenseDonutChart, WaterAreaChart } from './charts';
import { dashboardNav, DashboardSidebarIcon } from './nav-items';
import { ActivityFeed, AlertList, Panel, StockTable, WaterSourceGauges } from './panels';
import { StatTile } from './stat-tile';

export type DashboardViewState = 'normal' | 'loading' | 'empty' | 'error';

/**
 * Tableau de bord complet — utilisé dans la section « aperçu » de la landing.
 * L'état `view` permet de présenter les différentsサイクル de vie d'un
 * panneau de données : contenu, chargement, jeu vide et erreur.
 */
export function DashboardFull({ view = 'normal' }: { view?: DashboardViewState }) {
    const isLoading = view === 'loading';
    const isError = view === 'error';
    const isEmpty = view === 'empty';

    // Les données sont vidées uniquement en état « vide » afin de déclencher
    // les composants d'état vide plutôt que de simuler une absence de données.
    const data = useMemo(
        () => ({
            activities: isEmpty ? [] : recentActivities,
            stock: isEmpty ? [] : stockRows,
            alerts: isEmpty ? [] : alerts,
            sources: isEmpty ? [] : waterSources,
        }),
        [isEmpty],
    );

    /** Enveloppe un panneau de données selon l'état courant. */
    const panelState = isError ? 'error' : isLoading ? 'loading' : 'success';

    return (
        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-ink-50/40 shadow-lift">
            {/* Barre de navigateur */}
            <div className="flex items-center gap-3 border-b border-ink-100 bg-white px-4 py-2.5">
                <div className="flex gap-1.5" aria-hidden="true">
                    <span className="size-2.5 rounded-full bg-harvest-300" />
                    <span className="size-2.5 rounded-full bg-harvest-400" />
                    <span className="size-2.5 rounded-full bg-brand-400" />
                </div>
                <div className="mx-auto hidden max-w-sm flex-1 items-center justify-center gap-2 rounded-lg bg-ink-50 px-3 py-1 text-[0.625rem] text-ink-400 sm:flex">
                    <LockGlyph />
                    app.agriwater.mg/dashboard
                </div>
                <span className="ml-auto hidden text-[0.625rem] font-semibold text-brand-700 sm:block">
                    {activeFarm.name}
                </span>
            </div>

            <div className="flex">
                {/* Sidebar complète */}
                <nav
                    aria-label="Navigation du tableau de bord"
                    className="hidden w-56 shrink-0 flex-col border-r border-ink-100 bg-white p-3 md:flex"
                >
                    <span className="mb-3 flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-700 to-water-600 px-3 py-2.5 text-white">
                        <Sprout aria-hidden="true" className="size-4.5" />
                        <span className="font-display text-sm font-bold">AgriWater</span>
                    </span>

                    {dashboardNav.map((item) => (
                        <DashboardSidebarIcon
                            key={item.label}
                            item={item}
                            active={item.label === 'Vue d’ensemble'}
                        />
                    ))}

                    <div className="mt-auto rounded-xl border border-brand-100 bg-brand-50 p-3">
                        <p className="text-[0.625rem] font-bold uppercase tracking-wide text-brand-700">
                            Exploitation active
                        </p>
                        <p className="mt-1 truncate text-xs font-bold text-ink-900">{activeFarm.name}</p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-[0.625rem] text-ink-500">
                            <MapPin aria-hidden="true" className="size-3 shrink-0" />
                            {activeFarm.location}
                        </p>
                    </div>
                </nav>

                {/* Contenu principal */}
                <div className="min-w-0 flex-1">
                    {/* En-tête */}
                    <header className="flex items-center gap-3 border-b border-ink-100 bg-white px-4 py-3 sm:px-5">
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-sm font-bold text-ink-900 sm:text-base">
                                Bonjour, bienvenue sur AgriWater
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 truncate text-[0.6875rem] text-ink-400">
                                <MapPin aria-hidden="true" className="size-3 shrink-0" />
                                <span className="truncate">
                                    {activeFarm.name} · {activeFarm.type} · {formatNumber(activeFarm.totalArea)} ha
                                </span>
                            </p>
                        </div>

                        <InfoTooltip label="3 notifications non lues">
                            <span className="relative grid size-9 shrink-0 cursor-help place-items-center rounded-xl border border-ink-100 bg-white text-ink-500 shadow-soft">
                                <Bell aria-hidden="true" className="size-4" />
                                <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-harvest-500 text-[0.5rem] font-bold text-white ring-2 ring-white">
                                    3
                                </span>
                            </span>
                        </InfoTooltip>

                        <span className="flex shrink-0 items-center gap-2 rounded-xl border border-ink-100 bg-white py-1 pr-2.5 pl-1 shadow-soft">
                            <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-[0.625rem] font-bold text-white">
                                {currentUser.initials}
                            </span>
                            <span className="hidden text-[0.6875rem] leading-tight font-semibold text-ink-800 sm:block">
                                {currentUser.name}
                                <span className="block font-normal text-ink-400">{currentUser.role}</span>
                            </span>
                        </span>
                    </header>

                    <div className="space-y-3 p-4 sm:p-5">
                        {/* Tuiles */}
                        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                            {isLoading
                                ? Array.from({ length: 4 }).map((_, index) => <StatCardSkeleton key={index} />)
                                : heroStats.map((stat) => (
                                      <StatTile
                                          key={stat.id}
                                          size="md"
                                          label={stat.label}
                                          value={stat.value}
                                          unit={stat.unit}
                                          delta={stat.delta}
                                          hint={stat.hint}
                                          icon={stat.id}
                                          tone={stat.tone}
                                          favourableWhen={
                                              stat.id === 'depenses' || stat.id === 'eau' ? 'down' : 'up'
                                          }
                                      />
                                  ))}
                        </div>

                        {/* Eau + alertes */}
                        <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
                            <ChartCard
                                title="Consommation d’eau"
                                subtitle="Campagne 2026 · litres par mois"
                                legend={[
                                    { label: 'Consommation', color: '#0288D1' },
                                    { label: 'Référence N-1', color: '#81D4FA', dashed: true },
                                ]}
                                className="min-h-[16rem]"
                                bodyClassName="flex"
                            >
                                {isLoading ? (
                                    <ChartSkeleton className="mt-4 h-full" />
                                ) : isError ? (
                                    <ErrorState
                                        title="Graphique indisponible"
                                        description="Impossible de charger les relevés de consommation d’eau."
                                    />
                                ) : isEmpty ? (
                                    <EmptyState
                                        icon={Droplets}
                                        title="Aucun relevé d’eau"
                                        description="Les consommations s’afficheront après vos premières irrigations."
                                    />
                                ) : (
                                    <WaterAreaChart data={waterConsumptionYear} height={200} animate />
                                )}
                            </ChartCard>

                            <Panel
                                title="Alertes intelligentes"
                                icon={Bell}
                                subtitle={isEmpty ? 'Aucune alerte' : `${data.alerts.length} à traiter`}
                                className="min-h-[16rem]"
                            >
                                {panelState === 'error' ? (
                                    <ErrorState description="Les alertes de votre exploitation n’ont pas pu être chargées." />
                                ) : panelState === 'loading' ? (
                                    <ListSkeleton rows={3} />
                                ) : (
                                    <AlertList rows={data.alerts} />
                                )}
                            </Panel>
                        </div>

                        {/* Finances */}
                        <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
                            <ChartCard
                                title="Dépenses et recettes"
                                subtitle="Six derniers mois · Ariary"
                                legend={[
                                    { label: 'Dépenses', color: '#F59E0B' },
                                    { label: 'Recettes', color: '#2E7D32' },
                                ]}
                                className="min-h-[15rem]"
                                bodyClassName="flex"
                            >
                                {isLoading ? (
                                    <ChartSkeleton className="mt-4 h-full" />
                                ) : isError ? (
                                    <ErrorState title="Données financières indisponibles" />
                                ) : isEmpty ? (
                                    <EmptyState
                                        icon={Wallet}
                                        title="Aucune opération enregistrée"
                                        description="Ajoutez vos dépenses et recettes pour suivre votre résultat."
                                    />
                                ) : (
                                    <CashflowBarChart data={cashflow} height={190} animate />
                                )}
                            </ChartCard>

                            <ChartCard
                                title="Répartition des dépenses"
                                subtitle="Postes du mois en cours"
                                className="min-h-[15rem]"
                            >
                                {isLoading ? (
                                    <div className="space-y-2 pt-3">
                                        {Array.from({ length: 5 }).map((_, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <span className="size-3 animate-pulse rounded-full bg-ink-100" />
                                                <span className="h-2.5 flex-1 animate-pulse rounded bg-ink-100" />
                                            </div>
                                        ))}
                                    </div>
                                ) : isError ? (
                                    <ErrorState title="Répartition indisponible" />
                                ) : isEmpty ? (
                                    <EmptyState icon={ChartPie} title="Aucune dépense ce mois" />
                                ) : (
                                    <>
                                        <ExpenseDonutChart data={expenseBreakdown} height={150} />
                                        <ul className="mt-2 space-y-1.5">
                                            {expenseBreakdown.slice(0, 4).map((item, index) => (
                                                <li key={item.name} className="flex items-center justify-between text-[0.6875rem]">
                                                    <span className="flex items-center gap-1.5 text-ink-500">
                                                        <span
                                                            aria-hidden="true"
                                                            className="size-2 rounded-full"
                                                            style={{
                                                                backgroundColor: [
                                                                    '#2E7D32',
                                                                    '#0288D1',
                                                                    '#66BB6A',
                                                                    '#4FC3F7',
                                                                ][index],
                                                            }}
                                                        />
                                                        {item.name}
                                                    </span>
                                                    <span className="font-semibold text-ink-700">
                                                        {formatNumber(item.value)} Ar
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </ChartCard>
                        </div>

                        {/* Stocks + points d'eau */}
                        <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr]">
                            <Panel
                                title="État des stocks"
                                icon={Package}
                                subtitle="Intrants et seuils d’alerte"
                                className="min-h-[15rem]"
                            >
                                {panelState === 'error' ? (
                                    <ErrorState description="Le tableau des stocks n’a pas pu être chargé." />
                                ) : panelState === 'loading' ? (
                                    <ListSkeleton rows={4} />
                                ) : (
                                    <StockTable rows={data.stock} />
                                )}
                            </Panel>

                            <Panel title="Points d’eau" icon={Droplets} subtitle="Niveaux disponibles" className="min-h-[15rem]">
                                {panelState === 'error' ? (
                                    <ErrorState description="Les niveaux d’eau sont indisponibles." />
                                ) : panelState === 'loading' ? (
                                    <ListSkeleton rows={3} />
                                ) : data.sources.length === 0 ? (
                                    <EmptyState
                                        icon={Droplets}
                                        title="Aucune ressource en eau"
                                        description="Enregistrez un réservoir, une citerne ou un puits pour suivre vos niveaux."
                                    />
                                ) : (
                                    <WaterSourceGauges sources={data.sources} />
                                )}
                            </Panel>
                        </div>

                        {/* Activités */}
                        <Panel
                            title="Activités récentes"
                            icon={LayoutDashboard}
                            subtitle={`${activeFarm.plotsCount} parcelles · ${activeFarm.campaignsCount} campagnes`}
                        >
                            {panelState === 'error' ? (
                                <ErrorState description="Les activités récentes n’ont pas pu être chargées." />
                            ) : panelState === 'loading' ? (
                                <ListSkeleton rows={4} />
                            ) : (
                                <ActivityFeed rows={data.activities} />
                            )}
                        </Panel>
                    </div>
                </div>
            </div>
        </div>
    );
}

function LockGlyph() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="10" width="16" height="10" rx="2.5" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
    );
}