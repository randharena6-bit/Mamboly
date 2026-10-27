import {
    Bell,
    ChevronDown,
    CircleHelp,
    Command,
    LogOut,
    MapPin,
    Menu,
    PanelLeftClose,
    PanelLeftOpen,
    Search,
    Settings,
    Sprout,
    Tractor,
    UserRound,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { CommandPalette } from './command-palette';
import { dashboardNav, dashboardNavGroups, DashboardSidebarIcon } from './nav-items';

/**
 * Coquille de l'application : navigation latérale groupée, en-tête collant,
 * tiroir mobile et palette de commandes.
 *
 * `preview` conserve la maquette de navigateur utilisée par la page d'accueil ;
 * `app` occupe toute la fenêtre et reste collé au défilement.
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
    const isApp = variant === 'app';
    const heading = subtitle ?? defaultSubtitle(farm, surfaceUnit);
    const activeItem = dashboardNav.find((item) => item.href === activeNav);

    const [collapsed, setCollapsed] = useState(readCollapsed);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mobileOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setMobileOpen(false);
        };

        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [mobileOpen]);

    useEffect(() => {
        if (!isApp) return undefined;

        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setPaletteOpen((value) => !value);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isApp]);

    useEffect(() => {
        if (!profileOpen) return undefined;

        const onPointerDown = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setProfileOpen(false);
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setProfileOpen(false);
        };

        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [profileOpen]);

    const toggleCollapsed = () => {
        setCollapsed((value) => {
            const next = !value;

            try {
                window.localStorage.setItem('agriwater.sidebar.collapsed', next ? '1' : '0');
            } catch {
                // Le stockage peut être indisponible (navigation privée) : l'état reste en mémoire.
            }

            return next;
        });
    };

    const closeMobile = () => setMobileOpen(false);

    return (
        <div
            className={cn(
                isApp
                    ? 'app-backdrop min-h-screen'
                    : 'overflow-hidden rounded-3xl border border-ink-200/70 bg-ink-50/40 shadow-lift',
            )}
        >
            {!isApp && <BrowserChrome label={browserLabel} farm={farm} />}

            <div className="flex min-h-0">
                {/* Navigation de bureau */}
                <aside
                    className={cn(
                        'hidden shrink-0 flex-col border-r border-ink-200/60 bg-white/85 backdrop-blur-xl transition-[width] duration-300 md:flex',
                        isApp ? 'sticky top-0 h-screen' : 'min-h-[38rem]',
                        collapsed ? 'w-[5.25rem]' : 'w-[17.5rem]',
                    )}
                >
                    <SidebarHeader collapsed={collapsed} onToggle={toggleCollapsed} />

                    <SidebarNavigation
                        collapsed={collapsed}
                        activeNav={activeNav}
                        onNavigate={undefined}
                    />

                    <SidebarFooter collapsed={collapsed} farm={farm} />
                </aside>

                {/* Tiroir mobile */}
                {mobileOpen && (
                    <div className="fixed inset-0 z-50 md:hidden">
                        <button
                            type="button"
                            aria-label="Fermer le menu"
                            onClick={closeMobile}
                            className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm animate-fade-in"
                        />

                        <div className="relative flex h-full w-[19rem] max-w-[86vw] flex-col border-r border-ink-200/70 bg-white shadow-float animate-slide-in-left">
                            <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-4">
                                <BrandMark />
                                <button
                                    type="button"
                                    onClick={closeMobile}
                                    aria-label="Fermer le menu"
                                    className="grid size-9 place-items-center rounded-full border border-ink-200 text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-800"
                                >
                                    <X aria-hidden="true" className="size-4.5" />
                                </button>
                            </div>

                            <SidebarNavigation collapsed={false} activeNav={activeNav} onNavigate={closeMobile} />

                            <div className="border-t border-ink-100 p-3">
                                <SidebarFarmCard farm={farm} />
                                <MobileAccount user={user} />
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col">
                    {/* En-tête */}
                    <header
                        className={cn(
                            'border-b border-ink-200/60 bg-white/80 backdrop-blur-xl',
                            isApp ? 'sticky top-0 z-30' : 'bg-white',
                        )}
                    >
                        <div className="flex min-h-16 items-center gap-3 px-4 py-2.5 sm:px-6">
                            <button
                                type="button"
                                onClick={() => setMobileOpen(true)}
                                aria-label="Ouvrir le menu"
                                aria-expanded={mobileOpen}
                                className="grid size-10 shrink-0 place-items-center rounded-xl border border-ink-200 bg-white text-ink-600 shadow-xs transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800 md:hidden"
                            >
                                <Menu aria-hidden="true" className="size-5" />
                            </button>

                            <div className="min-w-0 flex-1">
                                <p className="hidden text-[0.625rem] font-bold tracking-[0.16em] text-brand-700 uppercase sm:block">
                                    {activeItem?.label ?? 'Espace de gestion'}
                                </p>
                                <p className="truncate font-display text-sm font-bold text-ink-900 sm:text-base">
                                    {title}
                                </p>
                                <p className="mt-0.5 flex items-center gap-1 truncate text-[0.6875rem] text-ink-400">
                                    <MapPin aria-hidden="true" className="size-3 shrink-0" />
                                    <span className="truncate">{heading}</span>
                                </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setPaletteOpen(true)}
                                    className="hidden h-10 items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-500 shadow-xs transition-colors hover:border-brand-200 hover:text-ink-800 sm:flex"
                                    aria-label="Rechercher un module"
                                >
                                    <Search aria-hidden="true" className="size-4" />
                                    <span className="hidden lg:inline">Rechercher</span>
                                    <kbd className="ml-2 hidden items-center gap-0.5 rounded-md border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-sans text-[0.625rem] font-semibold text-ink-400 lg:inline-flex">
                                        <Command aria-hidden="true" className="size-2.5" />K
                                    </kbd>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setPaletteOpen(true)}
                                    aria-label="Rechercher un module"
                                    className="grid size-10 place-items-center rounded-xl border border-ink-200 bg-white text-ink-500 shadow-xs transition-colors hover:border-brand-200 hover:text-ink-800 sm:hidden"
                                >
                                    <Search aria-hidden="true" className="size-4.5" />
                                </button>

                                <a
                                    href="/alertes"
                                    title={`${unreadAlerts} notification${unreadAlerts > 1 ? 's' : ''} non lue${unreadAlerts > 1 ? 's' : ''}`}
                                    className="relative grid size-10 place-items-center rounded-xl border border-ink-200 bg-white text-ink-500 shadow-xs transition-colors hover:border-brand-200 hover:text-ink-800"
                                >
                                    <Bell aria-hidden="true" className="size-4.5" />
                                    {unreadAlerts > 0 && (
                                        <span className="absolute -top-1 -right-1 grid min-w-4.5 place-items-center rounded-full bg-gradient-to-b from-harvest-500 to-harvest-600 px-1 text-[0.5625rem] font-bold text-white ring-2 ring-white">
                                            {unreadAlerts > 9 ? '9+' : unreadAlerts}
                                        </span>
                                    )}
                                    <span className="sr-only">
                                        {unreadAlerts} notification{unreadAlerts > 1 ? 's' : ''} non lue
                                        {unreadAlerts > 1 ? 's' : ''}
                                    </span>
                                </a>

                                <div className="relative" ref={profileRef}>
                                    <button
                                        type="button"
                                        onClick={() => setProfileOpen((value) => !value)}
                                        aria-expanded={profileOpen}
                                        aria-haspopup="menu"
                                        className="flex h-10 items-center gap-2 rounded-xl border border-ink-200 bg-white py-1 pr-2 pl-1 shadow-xs transition-colors hover:border-brand-200 hover:bg-brand-50/40"
                                    >
                                        <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-[0.6875rem] font-bold text-white shadow-[0_1px_0_rgb(255_255_255/0.25)_inset]">
                                            {user.initials}
                                        </span>
                                        <span className="hidden max-w-32 text-left text-[0.6875rem] leading-tight font-semibold text-ink-800 lg:block">
                                            <span className="block truncate">{user.name}</span>
                                            <span className="block truncate font-normal text-ink-400">{user.role}</span>
                                        </span>
                                        <ChevronDown
                                            aria-hidden="true"
                                            className={cn(
                                                'hidden size-3.5 text-ink-400 transition-transform duration-200 lg:block',
                                                profileOpen && 'rotate-180',
                                            )}
                                        />
                                    </button>

                                    {profileOpen && (
                                        <div
                                            role="menu"
                                            className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-ink-200/70 bg-white/95 shadow-float backdrop-blur-xl animate-scale-in"
                                        >
                                            <div className="flex items-center gap-3 border-b border-ink-100 bg-gradient-to-r from-brand-50/80 to-water-50/50 px-4 py-3">
                                                <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
                                                    {user.initials}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-bold text-ink-900">{user.name}</p>
                                                    <p className="truncate text-xs text-ink-500">{user.role}</p>
                                                </div>
                                            </div>

                                            <div className="p-1.5">
                                                <ProfileLink href="/dashboard" icon={Sprout} onSelect={() => setProfileOpen(false)}>
                                                    Tableau de bord
                                                </ProfileLink>
                                                <ProfileLink href="/exploitations" icon={Tractor} onSelect={() => setProfileOpen(false)}>
                                                    Mon exploitation
                                                </ProfileLink>
                                                <ProfileLink href="/comptes" icon={UserRound} onSelect={() => setProfileOpen(false)}>
                                                    Mon compte
                                                </ProfileLink>
                                                <ProfileLink href="/parametres" icon={Settings} onSelect={() => setProfileOpen(false)}>
                                                    Paramètres
                                                </ProfileLink>
                                            </div>

                                            <form method="POST" action="/logout" className="border-t border-ink-100 p-1.5">
                                                <CsrfField />
                                                <button
                                                    type="submit"
                                                    role="menuitem"
                                                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                                                >
                                                    <LogOut aria-hidden="true" className="size-4" />
                                                    Se déconnecter
                                                </button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </header>

                    <main className={cn('flex-1', isApp ? 'px-4 py-5 sm:px-6 lg:px-8 lg:py-7' : 'p-4')}>
                        <div className={cn('mx-auto w-full space-y-4 sm:space-y-5', isApp ? 'max-w-[100rem]' : 'max-w-none')}>
                            {children}
                        </div>
                    </main>
                </div>
            </div>

            {isApp && (
                <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} activeNav={activeNav} />
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Fragments de la coquille                                            */
/* ------------------------------------------------------------------ */

function SidebarHeader({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
    return (
        <div className={cn('flex items-center gap-2 border-b border-ink-100 px-3 py-4', collapsed && 'flex-col gap-3')}>
            <a
                href="/dashboard"
                aria-label="AgriWater — tableau de bord"
                className={cn('flex min-w-0 items-center gap-2.5', collapsed ? 'justify-center' : 'flex-1')}
            >
                <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-water-600 text-white shadow-[0_1px_0_rgb(255_255_255/0.28)_inset,0_10px_20px_-12px_rgb(13_42_16/0.8)]">
                    <Sprout aria-hidden="true" className="size-5" />
                </span>
                {!collapsed && (
                    <span className="min-w-0">
                        <span className="block truncate font-display text-sm font-extrabold tracking-tight text-ink-900">
                            AgriWater
                        </span>
                        <span className="block truncate text-[0.5625rem] font-semibold tracking-[0.12em] text-ink-400 uppercase">
                            Gestion agricole
                        </span>
                    </span>
                )}
            </a>

            <button
                type="button"
                onClick={onToggle}
                aria-label={collapsed ? 'Déplier la navigation' : 'Réduire la navigation'}
                title={collapsed ? 'Déplier la navigation' : 'Réduire la navigation'}
                className="hidden size-8 shrink-0 place-items-center rounded-lg border border-ink-200 bg-white text-ink-400 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 md:grid"
            >
                {collapsed ? (
                    <PanelLeftOpen aria-hidden="true" className="size-4" />
                ) : (
                    <PanelLeftClose aria-hidden="true" className="size-4" />
                )}
            </button>
        </div>
    );
}

function BrandMark() {
    return (
        <a href="/dashboard" className="flex items-center gap-2.5" aria-label="AgriWater — tableau de bord">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-water-600 text-white shadow-soft">
                <Sprout aria-hidden="true" className="size-5" />
            </span>
            <span>
                <span className="block font-display text-sm font-extrabold tracking-tight text-ink-900">AgriWater</span>
                <span className="block text-[0.5625rem] font-semibold tracking-[0.12em] text-ink-400 uppercase">
                    Gestion agricole
                </span>
            </span>
        </a>
    );
}

function SidebarNavigation({
    collapsed,
    activeNav,
    onNavigate,
}: {
    collapsed: boolean;
    activeNav?: string;
    onNavigate?: () => void;
}) {
    return (
        <nav
            aria-label="Navigation de l'application"
            className={cn('flex-1 overflow-y-auto py-4 scrollbar-none', collapsed ? 'px-2' : 'px-3')}
        >
            {dashboardNavGroups.map((group) => (
                <div key={group.label} className="mb-4 last:mb-0">
                    {collapsed ? (
                        <div aria-hidden="true" className="mx-auto mb-2 h-px w-6 bg-ink-200" />
                    ) : (
                        <p className="px-3 pb-1.5 text-[0.625rem] font-bold tracking-[0.14em] text-ink-400 uppercase">
                            {group.label}
                        </p>
                    )}

                    <div className={cn(collapsed ? 'flex flex-col items-center gap-1' : 'space-y-0.5')}>
                        {group.items.map((item) => (
                            <DashboardSidebarIcon
                                key={item.href}
                                item={item}
                                active={item.href === activeNav}
                                compact={collapsed}
                                onNavigate={onNavigate}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </nav>
    );
}

function SidebarFooter({ collapsed, farm }: { collapsed: boolean; farm: ShellFarm }) {
    if (collapsed) {
        return (
            <div className="flex flex-col items-center gap-2 border-t border-ink-100 p-3">
                <a
                    href="/exploitations"
                    title={farm?.name ?? 'Aucune exploitation'}
                    className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition-colors hover:bg-brand-100"
                >
                    <Tractor aria-hidden="true" className="size-4.5" />
                </a>
                <a
                    href="/documentation"
                    title="Aide et documentation"
                    className="grid size-10 place-items-center rounded-xl text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                >
                    <CircleHelp aria-hidden="true" className="size-4.5" />
                </a>
            </div>
        );
    }

    return (
        <div className="space-y-2 border-t border-ink-100 p-3">
            <SidebarFarmCard farm={farm} />

            <a
                href="/documentation"
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-ink-500 transition-colors hover:bg-ink-100/70 hover:text-ink-800"
            >
                <CircleHelp aria-hidden="true" className="size-4.5 text-ink-400" />
                Aide et documentation
            </a>
        </div>
    );
}

function SidebarFarmCard({ farm }: { farm: ShellFarm }) {
    if (!farm) {
        return (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/60 p-3 text-center">
                <p className="text-xs font-semibold text-ink-600">Aucune exploitation</p>
                <a href="/exploitations/create" className="mt-1 block text-[0.6875rem] font-semibold text-brand-700 hover:underline">
                    Créer une exploitation
                </a>
            </div>
        );
    }

    return (
        <a
            href="/exploitations"
            className="group block rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-water-50/60 p-3 transition-shadow hover:shadow-card"
        >
            <div className="flex items-center gap-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-brand-700 ring-1 ring-brand-100">
                    <Tractor aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[0.5625rem] font-bold tracking-[0.14em] text-brand-700 uppercase">
                        Exploitation active
                    </p>
                    <p className="truncate text-xs font-bold text-ink-900">{farm.name}</p>
                </div>
            </div>
            <p className="mt-2 flex items-center gap-1 truncate text-[0.625rem] text-ink-500">
                <MapPin aria-hidden="true" className="size-3 shrink-0" />
                <span className="truncate">{farm.location}</span>
            </p>
        </a>
    );
}

function MobileAccount({ user }: { user: ShellUser }) {
    return (
        <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-ink-200/70 bg-ink-50/60 p-2">
            <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-[0.6875rem] font-bold text-white">
                {user.initials}
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-ink-900">{user.name}</p>
                <p className="truncate text-[0.625rem] text-ink-400">{user.role}</p>
            </div>
            <form method="POST" action="/logout">
                <CsrfField />
                <button
                    type="submit"
                    aria-label="Se déconnecter"
                    className="grid size-8 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                    <LogOut aria-hidden="true" className="size-4" />
                </button>
            </form>
        </div>
    );
}

function ProfileLink({
    href,
    icon: Icon,
    onSelect,
    children,
}: {
    href: string;
    icon: typeof Sprout;
    onSelect: () => void;
    children: ReactNode;
}) {
    return (
        <a
            href={href}
            role="menuitem"
            onClick={onSelect}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100/70 hover:text-ink-900"
        >
            <Icon aria-hidden="true" className="size-4 text-ink-400" />
            {children}
        </a>
    );
}

function BrowserChrome({ label, farm }: { label: string; farm: ShellFarm }) {
    return (
        <div className="flex items-center gap-3 border-b border-ink-100 bg-white px-4 py-2.5">
            <div className="flex gap-1.5" aria-hidden="true">
                <span className="size-2.5 rounded-full bg-harvest-300" />
                <span className="size-2.5 rounded-full bg-harvest-400" />
                <span className="size-2.5 rounded-full bg-brand-400" />
            </div>
            <div className="mx-auto hidden max-w-sm flex-1 items-center justify-center gap-2 rounded-lg bg-ink-50 px-3 py-1 text-[0.625rem] text-ink-400 sm:flex">
                <LockGlyph />
                {label}
            </div>
            {farm && (
                <span className="ml-auto hidden text-[0.625rem] font-semibold text-brand-700 sm:block">
                    {farm.name}
                </span>
            )}
        </div>
    );
}

function CsrfField() {
    const token =
        typeof document === 'undefined'
            ? ''
            : document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';

    return <input type="hidden" name="_token" value={token} />;
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

function readCollapsed(): boolean {
    try {
        return window.localStorage.getItem('agriwater.sidebar.collapsed') === '1';
    } catch {
        return false;
    }
}

function LockGlyph() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="10" width="16" height="10" rx="2.5" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
    );
}
