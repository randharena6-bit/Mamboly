import {
    ChartColumnBig,
    CalendarCheck,
    Droplets,
    LayoutDashboard,
    MapPinned,
    Package,
    Settings,
    Tractor,
    Wallet,
} from 'lucide-react';

import { cn } from '../../lib/cn';
import type { ComponentType } from 'react';

/**
 * Navigation du tableau de bord. Utilisée par la maquette du hero
 * (icônes seules) et par l'aperçu immersif (icônes + libellés).
 */
export type DashboardNavItem = {
    label: string;
    icon: ComponentType<{ className?: string }>;
    href: string;
    badge?: string;
};

export const dashboardNav: DashboardNavItem[] = [
    { label: 'Vue d’ensemble', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Exploitations', icon: Tractor, href: '/exploitations' },
    { label: 'Parcelles', icon: MapPinned, href: '/parcelles' },
    { label: 'Activités', icon: CalendarCheck, href: '/activites' },
    { label: 'Stocks', icon: Package, href: '/stocks', badge: '1' },
    { label: 'Finances', icon: Wallet, href: '/finances' },
    { label: 'Consommation d’eau', icon: Droplets, href: '/eau' },
    { label: 'Rapports', icon: ChartColumnBig, href: '/rapports' },
    { label: 'Paramètres', icon: Settings, href: '/parametres' },
];

export function DashboardSidebarIcon({
    item,
    active,
    compact,
    className,
}: {
    item: DashboardNavItem;
    active?: boolean;
    compact?: boolean;
    className?: string;
}) {
    const Icon = item.icon;

    return (
        <a
            href={item.href}
            aria-label={compact ? item.label : undefined}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-colors duration-200',
                compact ? 'justify-center px-2.5 py-2.5' : 'px-3 py-2.5',
                active
                    ? 'bg-brand-50 text-brand-800'
                    : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800',
                className,
            )}
        >
            {active && (
                <span
                    aria-hidden="true"
                    className="absolute top-1/2 -left-2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-600"
                />
            )}
            <Icon
                className={cn(
                    'size-4.5 shrink-0 transition-transform duration-200 group-hover:scale-110',
                    active ? 'text-brand-700' : 'text-ink-400 group-hover:text-ink-600',
                )}
            />
            {!compact && <span className="truncate">{item.label}</span>}
            {!compact && item.badge && (
                <span className="ml-auto grid size-5 shrink-0 place-items-center rounded-full bg-harvest-500 text-[0.625rem] font-bold text-white">
                    {item.badge}
                </span>
            )}
        </a>
    );
}