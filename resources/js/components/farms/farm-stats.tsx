import { Droplets, Map, Sprout, Users, Wallet } from 'lucide-react';

import type { FarmsTotals } from '../../types/farm';

/**
 * Bandeau d'indicateurs transversaux de la page Exploitations (mode liste).
 *
 * Chaque compteur est une petite carte : libellé servé en français, valeur
 * agrégée côté serveur (`FarmService::totals`). Les montants sont des MGA.
 */

type StatItem = {
    label: string;
    value: string;
    icon: typeof Map;
    tone: 'brand' | 'water' | 'harvest' | 'ink';
};

function toStats(totals: FarmsTotals): StatItem[] {
    return [
        {
            label: 'Exploitations',
            value: String(totals.farms),
            icon: Map,
            tone: 'brand',
        },
        {
            label: 'Utilisateurs',
            value: String(totals.users),
            icon: Users,
            tone: 'ink',
        },
        {
            label: 'Parcelles',
            value: `${totals.plots} (${totals.plotsInCrop})`,
            icon: Sprout,
            tone: 'harvest',
        },
        {
            label: 'Campagnes actives',
            value: String(totals.campaignsActive),
            icon: Sprout,
            tone: 'ink',
        },
        {
            label: 'Valeur des stocks',
            value: `${totals.stockValue.toLocaleString('fr-FR')} MGA`,
            icon: Wallet,
            tone: 'water',
        },
        {
            label: 'Alertes non lues',
            value: String(totals.unreadAlerts),
            icon: Droplets,
            tone: totals.unreadAlerts > 0 ? 'harvest' : 'ink',
        },
    ];
}

const tones: Record<StatItem['tone'], string> = {
    brand: 'bg-brand-50 text-brand-700 ring-brand-100',
    water: 'bg-water-50 text-water-700 ring-water-100',
    harvest: 'bg-harvest-50 text-harvest-700 ring-harvest-100',
    ink: 'bg-ink-50 text-ink-600 ring-ink-100',
};

export function FarmStats({ totals }: { totals: FarmsTotals }) {
    const stats = toStats(totals);

    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
            {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
                    <span aria-hidden="true" className={`grid size-9 place-items-center rounded-xl ring-1 ${tones[stat.tone]}`}>
                        <stat.icon className="size-4.5" />
                    </span>
                    <p className="mt-3 font-display text-lg font-bold tracking-tight text-ink-900">{stat.value}</p>
                    <p className="mt-0.5 text-xs font-medium text-ink-500">{stat.label}</p>
                </div>
            ))}
        </div>
    );
}