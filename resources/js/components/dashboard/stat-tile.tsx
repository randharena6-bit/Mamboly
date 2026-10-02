import { Droplets, Ruler, TrendingDown, TrendingUp, Wallet, Warehouse } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { InfoTooltip } from '../ui/tooltip';

const icons = {
    surface: Ruler,
    stock: Warehouse,
    depenses: Wallet,
    eau: Droplets,
} as const;

const tones = {
    brand: 'bg-brand-50 text-brand-700 ring-brand-100',
    water: 'bg-water-50 text-water-700 ring-water-100',
    harvest: 'bg-harvest-50 text-harvest-700 ring-harvest-100',
    ink: 'bg-ink-50 text-ink-600 ring-ink-100',
} as const;

export type StatTileProps = {
    label: string;
    value: string;
    unit?: string;
    /** Variation en pourcentage par rapport à la période précédente. */
    delta?: number;
    /** Sens « favorable » de la variation (les dépenses baissent, l'eau baisse). */
    favourableWhen?: 'up' | 'down';
    hint?: string;
    icon?: keyof typeof icons;
    tone?: keyof typeof tones;
    size?: 'sm' | 'md';
    /** Affiche le graphique miniature décoratif sous la valeur. */
    spark?: ReactNode;
    className?: string;
};

/**
 * Tuile d'indicateur du tableau de bord. La variation est toujours
 * accompagnée d'une icône et d'un texte : jamais la couleur seule.
 */
export function StatTile({
    label,
    value,
    unit,
    delta,
    favourableWhen = 'up',
    hint,
    icon = 'surface',
    tone = 'brand',
    size = 'sm',
    spark,
    className,
}: StatTileProps) {
    const Icon = icons[icon];
    const rising = (delta ?? 0) >= 0;
    const favourable = rising === (favourableWhen === 'up');
    const Trend = rising ? TrendingUp : TrendingDown;

    const deltaTone = favourable
        ? 'text-brand-700 bg-brand-50 ring-brand-100'
        : 'text-harvest-700 bg-harvest-50 ring-harvest-100';

    return (
        <div
            className={cn(
                'group rounded-2xl border border-ink-100 bg-white shadow-soft transition-shadow duration-300 hover:shadow-card',
                size === 'sm' ? 'p-3.5' : 'p-5',
                className,
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <span
                    className={cn(
                        'grid shrink-0 place-items-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-105',
                        tones[tone],
                        size === 'sm' ? 'size-8 [&_svg]:size-4' : 'size-10 [&_svg]:size-5',
                    )}
                >
                    <Icon aria-hidden="true" />
                </span>

                {delta !== undefined && (
                    <InfoTooltip
                        label={`${Math.abs(delta).toString().replace('.', ',')} % par rapport à la période précédente`}
                    >
                        <span
                            className={cn(
                                'inline-flex cursor-help items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.625rem] font-bold ring-1',
                                deltaTone,
                            )}
                        >
                            <Trend aria-hidden="true" className="size-3" />
                            {Math.abs(delta).toString().replace('.', ',')} %
                            <span className="sr-only">
                                {rising ? 'de hausse' : 'de baisse'} par rapport à la période précédente
                            </span>
                        </span>
                    </InfoTooltip>
                )}
            </div>

            <p className={cn('mt-3 font-medium text-ink-500', size === 'sm' ? 'text-[0.6875rem]' : 'text-xs')}>
                {label}
            </p>

            <p className="mt-0.5 flex items-baseline gap-1">
                <span
                    className={cn(
                        'font-display font-extrabold tracking-tight text-ink-900',
                        size === 'sm' ? 'text-xl' : 'text-2xl',
                    )}
                >
                    {value}
                </span>
                {unit && <span className="text-xs font-semibold text-ink-400">{unit}</span>}
            </p>

            {hint && <p className="mt-1 truncate text-[0.6875rem] text-ink-400">{hint}</p>}
            {spark && <div className="mt-2">{spark}</div>}
        </div>
    );
}