import {
    CalendarCheck,
    CalendarClock,
    CalendarRange,
    ChartColumnBig,
    CloudRain,
    Droplets,
    HandCoins,
    LayoutDashboard,
    MapPinned,
    Package,
    Settings,
    Sprout,
    Tractor,
    Users,
    Wallet,
    Wheat,
} from 'lucide-react';
import type { ComponentType } from 'react';

import { cn } from '../../lib/cn';

/**
 * Navigation de l'application, regroupée par domaine métier.
 *
 * Chaque entrée pointe vers la page d'un module (`href` sert aussi de clé
 * d'entrée active : il doit correspondre à `ResourceConfig.endpoint`).
 */
export type DashboardNavItem = {
    label: string;
    icon: ComponentType<{ className?: string }>;
    href: string;
    badge?: string;
    /** Phrase courte utilisée par la palette de commandes. */
    description?: string;
};

export type DashboardNavGroup = {
    label: string;
    items: DashboardNavItem[];
};

export const dashboardNavGroups: DashboardNavGroup[] = [
    {
        label: 'Pilotage',
        items: [
            { label: 'Vue d’ensemble', icon: LayoutDashboard, href: '/dashboard', description: 'Indicateurs, eau, finances et alertes' },
            { label: 'Exploitations', icon: Tractor, href: '/exploitations', description: 'Fermes, équipes et superficie' },
        ],
    },
    {
        label: 'Production',
        items: [
            { label: 'Parcelles', icon: MapPinned, href: '/parcelles', description: 'Parcellaire, sols et priorités' },
            { label: 'Cultures', icon: Sprout, href: '/cultures', description: 'Catalogue des cultures' },
            { label: 'Campagnes', icon: CalendarRange, href: '/campagnes', description: 'Saisons et cycles culturaux' },
            { label: 'Activités', icon: CalendarCheck, href: '/activites', description: 'Journal des travaux' },
            { label: 'Récoltes', icon: Wheat, href: '/recoltes', description: 'Productions et pertes' },
        ],
    },
    {
        label: 'Eau & intrants',
        items: [
            { label: 'Ressources en eau', icon: Droplets, href: '/ressources-eau', description: 'Puits, citernes et réservoirs' },
            { label: 'Irrigations', icon: CloudRain, href: '/irrigations', description: 'Séances et consommation' },
            { label: 'Planifications', icon: CalendarClock, href: '/planifications', description: 'Irrigations à venir' },
            { label: 'Intrants', icon: Package, href: '/intrants', description: 'Stocks, seuils et mouvements' },
        ],
    },
    {
        label: 'Gestion',
        items: [
            { label: 'Dépenses', icon: Wallet, href: '/depenses', description: 'Charges et justificatifs' },
            { label: 'Recettes', icon: HandCoins, href: '/recettes', description: 'Ventes et entrées d’argent' },
            { label: 'Rapports', icon: ChartColumnBig, href: '/rapports', description: 'Synthèse par campagne' },
        ],
    },
    {
        label: 'Administration',
        items: [
            { label: 'Comptes', icon: Users, href: '/comptes', description: 'Équipe et rôles' },
            { label: 'Paramètres', icon: Settings, href: '/parametres', description: 'Préférences de l’espace' },
        ],
    },
];

export const dashboardNav: DashboardNavItem[] = dashboardNavGroups.flatMap((group) => group.items);

export function DashboardSidebarIcon({
    item,
    active,
    compact,
    className,
    onNavigate,
}: {
    item: DashboardNavItem;
    active?: boolean;
    compact?: boolean;
    className?: string;
    onNavigate?: () => void;
}) {
    const Icon = item.icon;

    return (
        <a
            href={item.href}
            onClick={onNavigate}
            aria-label={compact ? item.label : undefined}
            aria-current={active ? 'page' : undefined}
            title={compact ? item.label : undefined}
            className={cn(
                'group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200',
                compact ? 'mx-auto size-10 justify-center' : 'px-3 py-2.5',
                active
                    ? 'bg-white text-brand-800 shadow-[0_1px_2px_rgb(27_31_28/0.06),0_8px_20px_-12px_rgb(27_31_28/0.35)] ring-1 ring-brand-100'
                    : 'text-ink-600 hover:bg-white/70 hover:text-ink-900',
                className,
            )}
        >
            {active && !compact && (
                <span
                    aria-hidden="true"
                    className="absolute top-1/2 -left-3 h-6 w-1 -translate-y-1/2 rounded-r-full accent-line"
                />
            )}
            <span
                className={cn(
                    'grid shrink-0 place-items-center rounded-lg transition-all duration-200',
                    compact ? 'size-10' : 'size-8',
                    active
                        ? 'bg-brand-50 text-brand-700'
                        : 'bg-transparent text-ink-400 group-hover:bg-ink-100/70 group-hover:text-ink-700',
                )}
            >
                <Icon className="size-4.5" />
            </span>
            {!compact && <span className="truncate">{item.label}</span>}
            {!compact && item.badge && (
                <span className="ml-auto grid size-5 shrink-0 place-items-center rounded-full bg-harvest-500 text-[0.625rem] font-bold text-white">
                    {item.badge}
                </span>
            )}
        </a>
    );
}
