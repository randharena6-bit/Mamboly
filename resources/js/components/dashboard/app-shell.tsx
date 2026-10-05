import { Bell, MapPin, Sprout } from 'lucide-react';
import type { ReactNode } from 'react';

import { dashboardNav, DashboardSidebarIcon } from './nav-items';
import { InfoTooltip } from '../ui/tooltip';

/**
 * Coquille de l'application : barre de navigateur de l'aperçu, navigation
 * latérale et en-tête.
 *
 * Extraite du tableau de bord pour que chaque page connectée partage la même
 * navigation. La sidebar reste décorative : les entrées autres que la page
 * courante ne sont pas encore routées, et le rotor `href` ne le fait pas
 * croire.
 */

/** Exploitation summarized affichée dans la sidebar et l'en-tête. */
export type ShellFarm = {
    name: string;
    location: string;
    type?: string;
    totalArea?: number;
} | null;

export type ShellUser = {
    name: string;
    role: string;
    initials: string;
};

export function AppShell({
    children,
    variant = 'app',
    activeNav,
    farm = null,
    user,
    unreadAlerts = 0,
    title = 'Bonjour, bienvenue sur AgriWater',
    /** Remplace la ligne « exploitation · type · surface » de l'en-tête. */
    subtitle,
    /** Libellé affiché dans la barre de navigateur de l'aperçu. */
    browserLabel = 'app.agriwater.mg/dashboard',
    surfaceUnit = 'ha',
}: {
    children: ReactNode;
    /** `preview` ajoute la maquette de navigateur de la page d'accueil. */
    variant?: 'preview' | 'app';
    /** `href` de l'entrée de navigation active. */
    activeNav?: string;
    farm?: ShellFarm;
    user: ShellUser;
    unreadAlerts?: number;
    title?: string;
    subtitle?: ReactNode;
    browserLabel?: string;
    surfaceUnit?: string;
}) {
    const heading = subtitle ?? defaultSubtitle(farm, surfaceUnit);
    const alertsLabel = `${unreadAlerts} notification${unreadAlerts > 1 ? 's' : ''} non lue${unreadAlerts > 1 ? 's' : ''}`;

    return (
        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-ink-50/40 shadow-lift">
            {variant === 'preview' && (
                <div className="flex items-center gap-3 border-b border-ink-100 bg-white px-4 py-2.5">
                    <div className="flex gap-1.5" aria-hidden="true">
                        <span className="size-2.5 rounded-full bg-harvest-300" />
                        <span className="size-2.5 rounded-full bg-harvest-400" />
                        <span className="size-2.5 rounded-full bg-brand-400" />
                    </div>
                    <div className="mx-auto hidden max-w-sm flex-1 items-center justify-center gap-2 rounded-lg bg-ink-50 px-3 py-1 text-[0.625rem] text-ink-400 sm:flex">
                        <LockGlyph />
                        {browserLabel}
                    </div>
                    {farm && (
                        <span className="ml-auto hidden text-[0.625rem] font-semibold text-brand-700 sm:block">
                            {farm.name}
                        </span>
                    )}
                </div>
            )}

            <div className="flex">
                <nav
                    aria-label="Navigation de l'application"
                    className="hidden w-56 shrink-0 flex-col border-r border-ink-100 bg-white p-3 md:flex"
                >
                    <span className="mb-3 flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-700 to-water-600 px-3 py-2.5 text-white">
                        <Sprout aria-hidden="true" className="size-4.5" />
                        <span className="font-display text-sm font-bold">AgriWater</span>
                    </span>

                    {dashboardNav.map((item) => (
                        <DashboardSidebarIcon key={item.label} item={item} active={item.href === activeNav} />
                    ))}

                    {farm && (
                        <div className="mt-auto rounded-xl border border-brand-100 bg-brand-50 p-3">
                            <p className="text-[0.625rem] font-bold uppercase tracking-wide text-brand-700">
                                Exploitation active
                            </p>
                            <p className="mt-1 truncate text-xs font-bold text-ink-900">{farm.name}</p>
                            <p className="mt-0.5 flex items-center gap-1 truncate text-[0.625rem] text-ink-500">
                                <MapPin aria-hidden="true" className="size-3 shrink-0" />
                                {farm.location}
                            </p>
                        </div>
                    )}
                </nav>

                <div className="min-w-0 flex-1">
                    <header className="flex items-center gap-3 border-b border-ink-100 bg-white px-4 py-3 sm:px-5">
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-sm font-bold text-ink-900 sm:text-base">{title}</p>
                            <p className="mt-0.5 flex items-center gap-1 truncate text-[0.6875rem] text-ink-400">
                                <MapPin aria-hidden="true" className="size-3 shrink-0" />
                                <span className="truncate">{heading}</span>
                            </p>
                        </div>

                        {unreadAlerts > 0 && (
                            <InfoTooltip label={alertsLabel}>
                                <span className="relative grid size-9 shrink-0 cursor-help place-items-center rounded-xl border border-ink-100 bg-white text-ink-500 shadow-soft">
                                    <Bell aria-hidden="true" className="size-4" />
                                    <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-harvest-500 text-[0.5rem] font-bold text-white ring-2 ring-white">
                                        {unreadAlerts}
                                    </span>
                                </span>
                            </InfoTooltip>
                        )}

                        <span className="flex shrink-0 items-center gap-2 rounded-xl border border-ink-100 bg-white py-1 pr-2.5 pl-1 shadow-soft">
                            <span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-[0.625rem] font-bold text-white">
                                {user.initials}
                            </span>
                            <span className="hidden text-[0.6875rem] leading-tight font-semibold text-ink-800 sm:block">
                                {user.name}
                                <span className="block font-normal text-ink-400">{user.role}</span>
                            </span>
                        </span>
                    </header>

                    <div className="space-y-3 p-4 sm:p-5">{children}</div>
                </div>
            </div>
        </div>
    );
}

/** `exploitation · type · surface`, ligne par défaut de l'en-tête. */
function defaultSubtitle(farm: ShellFarm, unit: string): string {
    if (!farm) return 'Aucune exploitation sélectionnée';

    return [
        farm.name,
        farm.type,
        farm.totalArea === undefined ? undefined : `${farm.totalArea} ${unit}`,
    ]
        .filter(Boolean)
        .join(' · ');
}

function LockGlyph() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="10" width="16" height="10" rx="2.5" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
    );
}
