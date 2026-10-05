import {
    CircleAlert,
    CircleCheck,
    Droplets,
    Info,
    Package,
    Sprout,
    Tractor,
    TriangleAlert,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { formatNumber } from '../../lib/format';
import { EmptyState, ListSkeleton } from '../landing/states';
import type { ActivityRow, AlertRow, StockRow } from '../../data/mock';

/* ------------------------------------------------------------------ */
/* Coquille de panneau                                                 */
/* ------------------------------------------------------------------ */

export function Panel({
    title,
    subtitle,
    icon: Icon,
    trailing,
    className,
    bodyClassName,
    children,
}: {
    title: string;
    subtitle?: string;
    icon?: ComponentType<{ className?: string }>;
    trailing?: ReactNode;
    className?: string;
    bodyClassName?: string;
    children: ReactNode;
}) {
    return (
        <section
            className={cn(
                'flex flex-col rounded-2xl border border-ink-100 bg-white p-4 shadow-soft',
                className,
            )}
        >
            <header className="mb-3 flex items-center gap-2">
                {Icon && (
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                        <Icon className="size-3.5" />
                    </span>
                )}
                <div className="min-w-0 flex-1">
                    <h4 className="truncate font-display text-[0.8125rem] font-bold text-ink-900">{title}</h4>
                    {subtitle && <p className="truncate text-[0.6875rem] text-ink-400">{subtitle}</p>}
                </div>
                {trailing}
            </header>
            <div className={cn('min-w-0 flex-1', bodyClassName)}>{children}</div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/* Activités récentes                                                  */
/* ------------------------------------------------------------------ */

const activityTone = {
    water: 'bg-water-50 text-water-700 ring-water-100',
    brand: 'bg-brand-50 text-brand-700 ring-brand-100',
    harvest: 'bg-harvest-50 text-harvest-700 ring-harvest-100',
    ink: 'bg-ink-50 text-ink-600 ring-ink-100',
} as const;

const activityIcons: Record<ActivityRow['tone'], ComponentType<{ className?: string }>> = {
    water: Droplets,
    brand: Sprout,
    harvest: Tractor,
    ink: Package,
};

export function ActivityFeed({
    rows,
    status = 'success',
    limit,
}: {
    rows: ActivityRow[];
    status?: 'loading' | 'success';
    limit?: number;
}) {
    if (status === 'loading') return <ListSkeleton rows={limit ?? 3} />;

    const visible = limit ? rows.slice(0, limit) : rows;

    if (visible.length === 0) {
        return (
            <EmptyState
                icon={Sprout}
                title="Aucune activité récente"
                description="Les travaux enregistrés sur vos parcelles apparaîtront ici."
            />
        );
    }

    return (
        <ol className="space-y-2">
            {visible.map((row) => {
                const Icon = activityIcons[row.tone];

                return (
                    <li key={row.id} className="flex items-start gap-2.5 rounded-xl p-1 transition-colors hover:bg-ink-50/80">
                        <span
                            className={cn(
                                'mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ring-1',
                                activityTone[row.tone],
                            )}
                        >
                            <Icon aria-hidden="true" className="size-4" />
                        </span>

                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-ink-900">
                                <span className="text-ink-400">{row.type}</span> · {row.label}
                            </p>
                            <p className="truncate text-[0.6875rem] text-ink-400">
                                {row.plot} — {row.detail}
                            </p>
                        </div>

                        <time className="shrink-0 pt-0.5 text-[0.625rem] font-medium whitespace-nowrap text-ink-400">
                            {row.when}
                        </time>
                    </li>
                );
            })}
        </ol>
    );
}

/* ------------------------------------------------------------------ */
/* Alertes                                                             */
/* ------------------------------------------------------------------ */

const severityMeta = {
    critique: {
        label: 'Critique',
        icon: CircleAlert,
        card: 'border-harvest-200 bg-harvest-50',
        iconStyle: 'bg-harvest-100 text-harvest-700',
    },
    avertissement: {
        label: 'Avertissement',
        icon: TriangleAlert,
        card: 'border-harvest-100 bg-white',
        iconStyle: 'bg-harvest-50 text-harvest-600',
    },
    info: {
        label: 'Information',
        icon: Info,
        card: 'border-water-100 bg-white',
        iconStyle: 'bg-water-50 text-water-700',
    },
} as const;

export function AlertList({ rows, limit }: { rows: AlertRow[]; limit?: number }) {
    const visible = limit ? rows.slice(0, limit) : rows;

    if (visible.length === 0) {
        return (
            <EmptyState
                icon={CircleCheck}
                title="Aucune alerte en cours"
                description="Tous vos seuils et niveaux de stock sont au vert."
            />
        );
    }

    return (
        <ul className="space-y-2">
            {visible.map((alert) => {
                const meta = severityMeta[alert.severity];
                const Icon = meta.icon;

                return (
                    <li
                        key={alert.id}
                        className={cn('flex items-start gap-2.5 rounded-xl border p-2.5', meta.card)}
                    >
                        <span
                            className={cn(
                                'mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg',
                                meta.iconStyle,
                            )}
                        >
                            <Icon aria-hidden="true" className="size-3.5" />
                        </span>

                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-ink-900">{alert.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-[0.6875rem] leading-relaxed text-ink-500">
                                {alert.message}
                            </p>
                            <p className="mt-1 flex items-center gap-1.5 text-[0.625rem] font-semibold text-ink-400">
                                <Icon aria-hidden="true" className="size-3" />
                                {meta.label}
                                <span aria-hidden="true">·</span>
                                {alert.time}
                            </p>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

/* ------------------------------------------------------------------ */
/* Tableau des stocks                                                  */
/* ------------------------------------------------------------------ */

const stockStatusMeta = {
    ok: { label: 'Normal', icon: CircleCheck, style: 'bg-brand-50 text-brand-700 ring-brand-100' },
    bas: { label: 'Bas', icon: TriangleAlert, style: 'bg-harvest-50 text-harvest-700 ring-harvest-100' },
    critique: { label: 'Critique', icon: CircleAlert, style: 'bg-harvest-100 text-harvest-700 ring-harvest-200' },
} as const;

/** Détermine l'état du stock à partir du seuil : jamais la couleur seule. */
export function resolveStockStatus(row: StockRow): keyof typeof stockStatusMeta {
    if (row.quantity <= 0) return 'critique';
    if (row.quantity < row.threshold * 0.5) return 'critique';
    if (row.quantity < row.threshold) return 'bas';
    return 'ok';
}

export function StockStatusBadge({ row }: { row: StockRow }) {
    const meta = stockStatusMeta[resolveStockStatus(row)];
    const Icon = meta.icon;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-bold ring-1',
                meta.style,
            )}
        >
            <Icon aria-hidden="true" className="size-3" />
            {meta.label}
        </span>
    );
}

export function StockTable({ rows }: { rows: StockRow[] }) {
    if (rows.length === 0) {
        return (
            <EmptyState
                icon={Package}
                title="Aucun intrant enregistré"
                description="Ajoutez vos semences, engrais et produits pour suivre vos niveaux de stock."
            />
        );
    }

    return (
        <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-left">
                <caption className="sr-only">État des stocks d’intrants de l’exploitation Tsinjo Maitso</caption>
                <thead>
                    <tr className="border-b border-ink-100 text-[0.625rem] uppercase tracking-wide text-ink-400">
                        <th scope="col" className="px-1 pb-2 font-semibold">Intrant</th>
                        <th scope="col" className="px-1 pb-2 font-semibold">Disponible</th>
                        <th scope="col" className="px-1 pb-2 font-semibold">Seuil</th>
                        <th scope="col" className="px-1 pb-2 text-right font-semibold">État</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/60">
                            <td className="px-1 py-2.5">
                                <p className="text-xs font-semibold text-ink-900">{row.name}</p>
                                <p className="text-[0.625rem] text-ink-400">{row.category}</p>
                            </td>
                            <td className="px-1 py-2.5 text-xs font-semibold text-ink-800">
                                {row.quantity.toLocaleString('fr-MG')} {row.unit}
                            </td>
                            <td className="px-1 py-2.5 text-xs text-ink-500">
                                {formatNumber(row.threshold)} {row.unit}
                            </td>
                            <td className="px-1 py-2.5 text-right">
                                <StockStatusBadge row={row} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Points d'eau                                                        */
/* ------------------------------------------------------------------ */

export function WaterSourceGauges({
    sources,
}: {
    sources: readonly {
        name: string;
        available: number;
        capacity: number;
        threshold: number;
        unit?: string;
        status: 'ok' | 'critique';
    }[];
}) {
    return (
        <ul className="space-y-3">
            {sources.map((source) => {
                const ratio = Math.min((source.available / source.capacity) * 100, 100);
                const critical = source.status === 'critique';
                const unit = source.unit ?? 'L';

                return (
                    <li key={source.name}>
                        <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate text-xs font-semibold text-ink-800">{source.name}</p>
                            <p className="shrink-0 text-[0.6875rem] text-ink-500">
                                {formatNumber(source.available)} / {formatNumber(source.capacity)} {unit}
                            </p>
                        </div>

                        <div
                            className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-100"
                            role="img"
                            aria-label={`${source.name} : ${formatNumber(source.available)} litres disponibles sur ${formatNumber(source.capacity)} — ${critical ? 'niveau critique' : 'niveau normal'}`}
                        >
                            <div
                                className={cn(
                                    'h-full rounded-full transition-[width] duration-700',
                                    critical
                                        ? 'bg-gradient-to-r from-harvest-500 to-harvest-600'
                                        : 'bg-gradient-to-r from-water-500 to-brand-500',
                                )}
                                style={{ width: `${ratio}%` }}
                            />
                        </div>

                        <p
                            className={cn(
                                'mt-1 flex items-center gap-1 text-[0.625rem] font-semibold',
                                critical ? 'text-harvest-700' : 'text-ink-400',
                            )}
                        >
                            {critical ? (
                                <>
                                    <CircleAlert aria-hidden="true" className="size-3" />
                                    Sous le seuil critique de {formatNumber(source.threshold)} L
                                </>
                            ) : (
                                <>
                                    <CircleCheck aria-hidden="true" className="size-3" />
                                    Niveau normal · seuil {formatNumber(source.threshold)} L
                                </>
                            )}
                        </p>
                    </li>
                );
            })}
        </ul>
    );
}