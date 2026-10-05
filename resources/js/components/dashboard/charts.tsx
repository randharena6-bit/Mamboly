import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { formatNumber } from '../../lib/format';

/* ------------------------------------------------------------------ */
/* Infobulle personnalisée                                              */
/* ------------------------------------------------------------------ */

type PayloadEntry = {
    name?: string | number;
    dataKey?: string | number;
    value?: number | string;
    color?: string;
    fill?: string;
};

type ChartTooltipProps = {
    active?: boolean;
    label?: string | number;
    payload?: PayloadEntry[];
    /** Transforme la valeur brute d'une série en libellé lisible. */
    formatValue?: (key: string, value: number) => string;
    /** Ajoute une ligne de total (part du total). */
    withShare?: boolean;
    mutedKeys?: string[];
};

const litres = (value: number) => `${formatNumber(value)} L`;
const ariary = (value: number) => `${formatNumber(value)} Ar`;

function ChartTooltip({
    active,
    label,
    payload,
    formatValue = (key, value) => (key.includes('consommation') || key.includes('reference') ? litres(value) : ariary(value)),
    withShare = false,
    mutedKeys = ['reference'],
}: ChartTooltipProps) {
    if (!active || !payload?.length) return null;

    const total = payload.reduce((sum, entry) => sum + (typeof entry.value === 'number' ? entry.value : 0), 0);

    const rows = payload
        // Une série absente sur un mois (`null`) n'est pas une mesure à zéro :
        // elle ne doit pas apparaître dans l'infobulle.
        .filter((entry) => typeof entry.value === 'number')
        .map((entry) => {
            const key = String(entry.dataKey ?? entry.name ?? '');
            const value = entry.value as number;

            return {
                name: String(entry.name ?? key),
                value: formatValue(key, value),
                color: (entry.color as string) ?? (entry.fill as string) ?? '#2E7D32',
                muted: mutedKeys.includes(key),
                share: withShare && total > 0 ? `${Math.round((value / total) * 100)} %` : undefined,
            };
        });

    if (rows.length === 0) return null;

    return (
        <div className="pointer-events-none min-w-44 rounded-xl border border-ink-100 bg-white/95 px-3 py-2 shadow-lift backdrop-blur-sm">
            {label !== undefined && (
                <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-400">{label}</p>
            )}
            <ul className="space-y-1">
                {rows.map((row) => (
                    <li key={row.name} className="flex items-center justify-between gap-4 text-xs">
                        <span className="flex items-center gap-1.5 text-ink-500">
                            <span
                                aria-hidden="true"
                                className="size-2 shrink-0 rounded-full"
                                style={{ backgroundColor: row.color }}
                            />
                            {row.name}
                        </span>
                        <span className="font-bold text-ink-900">
                            {row.value}
                            {row.share && <span className="ml-1.5 font-medium text-ink-400">{row.share}</span>}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Coquille de graphique                                               */
/* ------------------------------------------------------------------ */

export function ChartCard({
    title,
    subtitle,
    legend,
    action,
    children,
    className,
    bodyClassName,
}: {
    title: string;
    subtitle?: string;
    legend?: { label: string; color: string; dashed?: boolean }[];
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    bodyClassName?: string;
}) {
    return (
        <div
            className={cn(
                'flex flex-col rounded-2xl border border-ink-100 bg-white p-4 shadow-soft',
                className,
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h4 className="truncate font-display text-[0.8125rem] font-bold text-ink-900">{title}</h4>
                    {subtitle && <p className="mt-0.5 truncate text-[0.6875rem] text-ink-400">{subtitle}</p>}
                </div>
                {action}
            </div>

            {legend && (
                <ul className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1">
                    {legend.map((item) => (
                        <li key={item.label} className="flex items-center gap-1.5 text-[0.6875rem] text-ink-500">
                            <span
                                aria-hidden="true"
                                className={cn('h-0.5 w-3.5 rounded-full', item.dashed && 'opacity-70')}
                                style={
                                    item.dashed
                                        ? {
                                              backgroundImage:
                                                  'repeating-linear-gradient(90deg, currentColor 0 3px, transparent 3px 5px)',
                                              color: item.color,
                                          }
                                        : { backgroundColor: item.color }
                                }
                            />
                            {item.label}
                        </li>
                    ))}
                </ul>
            )}

            <div className={cn('mt-2 min-w-0 flex-1', bodyClassName)}>{children}</div>
        </div>
    );
}

const axisTick = { fontSize: 10, fill: '#8a928d' } as const;

/* ------------------------------------------------------------------ */
/* Consommation d'eau (aire)                                           */
/* ------------------------------------------------------------------ */

/** `reference` vaut `null` quand aucune donnée N-1 n'existe pour ce mois. */
export type WaterPoint = { month: string; consommation: number; reference: number | null };

export function WaterAreaChart({
    data,
    height = 140,
    animate = false,
}: {
    data: readonly WaterPoint[];
    height?: number;
    animate?: boolean;
}) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data as WaterPoint[]} margin={{ top: 4, right: 2, left: -26, bottom: 0 }}>
                <defs>
                    <linearGradient id="agri-water-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0288D1" stopOpacity={0.34} />
                        <stop offset="100%" stopColor="#0288D1" stopOpacity={0.02} />
                    </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#edf0ee" strokeDasharray="3 4" />
                <XAxis
                    dataKey="month"
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                    dy={4}
                    interval="preserveStartEnd"
                />
                <YAxis
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    tickFormatter={(value: number) => `${Math.round(value / 1000)} k`}
                />
                <Tooltip
                    cursor={{ stroke: '#0288D1', strokeOpacity: 0.25, strokeWidth: 1 }}
                    content={<ChartTooltip />}
                />
                <Area
                    type="monotone"
                    dataKey="reference"
                    name="Référence N-1"
                    stroke="#81D4FA"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="none"
                    isAnimationActive={animate}
                    animationDuration={700}
                />
                <Area
                    type="monotone"
                    dataKey="consommation"
                    name="Consommation"
                    stroke="#0288D1"
                    strokeWidth={2.4}
                    fill="url(#agri-water-fill)"
                    dot={false}
                    activeDot={{ r: 3.5, strokeWidth: 2, stroke: '#fff' }}
                    isAnimationActive={animate}
                    animationDuration={800}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

/* ------------------------------------------------------------------ */
/* Dépenses / recettes (barres groupées)                               */
/* ------------------------------------------------------------------ */

export type CashflowPoint = { month: string; depenses: number; recettes: number };

export function CashflowBarChart({
    data,
    height = 140,
    animate = false,
}: {
    data: readonly CashflowPoint[];
    height?: number;
    animate?: boolean;
}) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data as CashflowPoint[]} margin={{ top: 4, right: 2, left: -26, bottom: 0 }} barGap={2}>
                <CartesianGrid vertical={false} stroke="#edf0ee" strokeDasharray="3 4" />
                <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} dy={4} />
                <YAxis
                    tick={axisTick}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    tickFormatter={(value: number) => `${(value / 1000000).toFixed(1).replace('.', ',')} M`}
                />
                <Tooltip cursor={{ fill: '#2E7D32', fillOpacity: 0.05 }} content={<ChartTooltip mutedKeys={[]} />} />
                <Bar
                    dataKey="depenses"
                    name="Dépenses"
                    fill="#F59E0B"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={14}
                    isAnimationActive={animate}
                    animationDuration={700}
                />
                <Bar
                    dataKey="recettes"
                    name="Recettes"
                    fill="#2E7D32"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={14}
                    isAnimationActive={animate}
                    animationDuration={700}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}

/* ------------------------------------------------------------------ */
/* Répartition des dépenses (anneau)                                    */
/* ------------------------------------------------------------------ */

export type Slice = { name: string; value: number };

const donutColors = ['#2E7D32', '#0288D1', '#66BB6A', '#4FC3F7', '#F59E0B', '#81C784'];

export function ExpenseDonutChart({
    data,
    height = 180,
    animate = true,
}: {
    data: readonly Slice[];
    height?: number;
    animate?: boolean;
}) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
        <div className="relative" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data as Slice[]}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="62%"
                        outerRadius="92%"
                        paddingAngle={2.5}
                        stroke="none"
                        isAnimationActive={animate}
                        animationDuration={700}
                    >
                        {data.map((item, index) => (
                            <Cell key={item.name} fill={donutColors[index % donutColors.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip formatValue={(_, value) => ariary(value)} withShare mutedKeys={[]} />} />
                </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                    <p className="font-display text-lg font-extrabold leading-none text-ink-900">1,24 M</p>
                    <p className="mt-1 text-[0.625rem] font-medium uppercase tracking-wide text-ink-400">Ar / mois</p>
                    <p className="sr-only">Total des dépenses du mois : {formatNumber(total)} Ariary</p>
                </div>
            </div>
        </div>
    );
}