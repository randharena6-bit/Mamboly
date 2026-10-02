import { Bell, MapPin, Sprout } from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '../../lib/cn';
import { activeFarm, cashflow, currentUser, heroStats, recentActivities, stockRows, waterConsumption } from '../../data/mock';
import { ListSkeleton } from '../landing/states';
import { InfoTooltip } from '../ui/tooltip';
import { CashflowBarChart, ChartCard, WaterAreaChart } from './charts';
import { dashboardNav, DashboardSidebarIcon } from './nav-items';
import { ActivityFeed, Panel, StockStatusBadge } from './panels';
import { StatTile } from './stat-tile';

/**
 * Maquette compacte du tableau de bord utilisée dans la section hero.
 * L'état « chargement » est réellement interprété puis remplacé par les
 * données, ce qui illustre le rendu attendu en production.
 */
export function DashboardPreview({ className }: { className?: string }) {
    const [status, setStatus] = useState<'loading' | 'success'>('loading');

    useEffect(() => {
        const timer = window.setTimeout(() => setStatus('success'), 1100);
        return () => window.clearTimeout(timer);
    }, []);

    const criticalStock = stockRows.filter((row) => row.quantity < row.threshold);

    return (
        <div
            className={cn(
                'overflow-hidden rounded-2xl border border-white/70 bg-white/85 shadow-float backdrop-blur-md',
                className,
            )}
        >
            <div className="flex">
                {/* Sidebar compacte */}
                <nav
                    aria-label="Navigation du tableau de bord (aperçu)"
                    className="hidden w-16 shrink-0 flex-col gap-1 border-r border-ink-100/80 bg-sand-50/70 p-2.5 sm:flex"
                >
                    <span className="mb-1 grid h-9 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-water-600 text-white shadow-soft">
                        <Sprout aria-hidden="true" className="size-4.5" />
                    </span>

                    {dashboardNav.map((item) => (
                        <InfoTooltip key={item.label} label={item.label} side="right">
                            <div className="w-full">
                                <DashboardSidebarIcon item={item} compact active={item.label === 'Vue d’ensemble'} />
                            </div>
                        </InfoTooltip>
                    ))}
                </nav>

                {/* Contenu */}
                <div className="min-w-0 flex-1">
                    {/* Topbar */}
                    <header className="flex items-center gap-3 border-b border-ink-100/80 px-4 py-3">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[0.8125rem] font-bold text-ink-900">
                                Bonjour, bienvenue sur AgriWater
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 text-[0.6875rem] text-ink-400">
                                <MapPin aria-hidden="true" className="size-3" />
                                <span className="truncate">
                                    Exploitation active : {activeFarm.name} — {activeFarm.location}
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

                    <div className="space-y-3 p-4">
                        {/* Tuiles */}
                        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                            {heroStats.map((stat) => (
                                <StatTile
                                    key={stat.id}
                                    label={stat.label}
                                    value={stat.value}
                                    unit={stat.unit}
                                    delta={stat.delta}
                                    hint={stat.hint}
                                    icon={stat.id}
                                    tone={stat.tone}
                                    favourableWhen={stat.id === 'depenses' || stat.id === 'eau' ? 'down' : 'up'}
                                />
                            ))}
                        </div>

                        {/* Graphiques */}
                        <div className="grid gap-2.5 sm:grid-cols-2">
                            <ChartCard
                                title="Consommation d’eau"
                                subtitle="6 derniers mois · litres"
                                legend={[
                                    { label: 'Consommation', color: '#0288D1' },
                                    { label: 'N-1', color: '#81D4FA', dashed: true },
                                ]}
                            >
                                <WaterAreaChart data={waterConsumption} height={128} />
                            </ChartCard>

                            <ChartCard
                                title="Dépenses & recettes"
                                subtitle="Ariary par mois"
                                legend={[
                                    { label: 'Dépenses', color: '#F59E0B' },
                                    { label: 'Recettes', color: '#2E7D32' },
                                ]}
                            >
                                <CashflowBarChart data={cashflow} height={128} />
                            </ChartCard>
                        </div>

                        {/* Activités + alerte de stock */}
                        <div className="grid gap-2.5 sm:grid-cols-[1.35fr_1fr]">
                            <Panel title="Activités récentes" icon={Sprout} subtitle="Exploitation Tsinjo Maitso">
                                {status === 'loading' ? (
                                    <ListSkeleton rows={3} />
                                ) : (
                                    <ActivityFeed rows={recentActivities} limit={3} />
                                )}
                            </Panel>

                            <Panel
                                title="Alertes de stock"
                                icon={Bell}
                                subtitle={`${criticalStock.length} intrant sous le seuil`}
                            >
                                <ul className="space-y-2">
                                    {criticalStock.map((row) => (
                                        <li
                                            key={row.id}
                                            className="flex items-center gap-2 rounded-xl border border-harvest-100 bg-harvest-50 p-2"
                                        >
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-xs font-semibold text-ink-900">
                                                    {row.name}
                                                </span>
                                                <span className="block text-[0.625rem] text-ink-500">
                                                    {row.quantity.toLocaleString('fr-MG')} {row.unit} · seuil{' '}
                                                    {row.threshold} {row.unit}
                                                </span>
                                            </span>
                                            <StockStatusBadge row={row} />
                                        </li>
                                    ))}
                                </ul>
                            </Panel>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}