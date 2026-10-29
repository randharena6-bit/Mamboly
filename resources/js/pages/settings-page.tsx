import {
    ArrowUpRight,
    Bell,
    MapPin,
    Mail,
    Palette,
    Phone,
    ShieldCheck,
    Tractor,
    UserRound,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type { ModuleContext } from '../components/app/resource-page';
import { AppShell } from '../components/dashboard/app-shell';
import { ErrorState } from '../components/landing/states';
import {
    AppearanceForm,
    applyReduceMotion,
    FarmForm,
    NotificationsForm,
    PasswordForm,
    ProfileForm,
    SessionsCard,
} from '../components/settings/settings-forms';
import type {
    SettingsFarm,
    SettingsPayload,
    SettingsPreferences,
    SettingsTab,
    SettingsUser,
} from '../components/settings/types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { cn } from '../lib/cn';
import { formatDate, formatRelativeTime } from '../lib/format';
import { HttpError, http } from '../lib/http';

const TABS: Array<{
    id: SettingsTab;
    label: string;
    description: string;
    icon: typeof UserRound;
}> = [
    { id: 'profil', label: 'Profil', description: 'Identité et coordonnées', icon: UserRound },
    { id: 'securite', label: 'Sécurité', description: 'Mot de passe et sessions', icon: ShieldCheck },
    { id: 'exploitation', label: 'Exploitation', description: 'Informations de la ferme', icon: Tractor },
    { id: 'notifications', label: 'Notifications', description: 'Alertes et e-mail', icon: Bell },
    { id: 'apparence', label: 'Apparence', description: 'Confort visuel', icon: Palette },
];

type LoadState =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; data: SettingsPayload };

export function SettingsPage({ endpoint, context }: { endpoint: string; context: ModuleContext }) {
    const [state, setState] = useState<LoadState>({ status: 'loading' });
    const [tab, setTab] = useState<SettingsTab>(readTab);

    const load = useCallback(async () => {
        setState({ status: 'loading' });

        try {
            const data = await http.get<SettingsPayload>(endpoint);
            applyReduceMotion(data.user.preferences.reduce_motion);
            setState({ status: 'ready', data });
        } catch (error) {
            setState({
                status: 'error',
                message:
                    error instanceof HttpError
                        ? error.userMessage
                        : 'Le serveur n’a pas répondu. Vérifiez votre connexion puis réessayez.',
            });
        }
    }, [endpoint]);

    useEffect(() => {
        void load();
    }, [load]);

    const selectTab = (next: SettingsTab) => {
        setTab(next);
        window.history.replaceState(null, '', `#${next}`);
    };

    const updateUser = (user: SettingsUser) => {
        setState((current) =>
            current.status === 'ready'
                ? { status: 'ready', data: { ...current.data, user } }
                : current,
        );
    };

    const updateFarm = (farm: SettingsFarm) => {
        setState((current) =>
            current.status === 'ready'
                ? { status: 'ready', data: { ...current.data, farm } }
                : current,
        );
    };

    const updatePreferences = (preferences: SettingsPreferences) => {
        setState((current) =>
            current.status === 'ready'
                ? {
                      status: 'ready',
                      data: {
                          ...current.data,
                          user: { ...current.data.user, preferences },
                      },
                  }
                : current,
        );
    };

    const data = state.status === 'ready' ? state.data : null;
    const user = data?.user ?? context.user ?? { name: 'Utilisateur', role: null, initials: '—' };
    const farm = data?.farm
        ? {
              name: data.farm.name,
              location: data.farm.location ?? 'Localisation non renseignée',
              type: data.farm.type ?? undefined,
              totalArea: data.farm.totalArea,
          }
        : context.farm
          ? {
                name: context.farm.name,
                location: context.farm.location ?? 'Localisation non renseignée',
                type: context.farm.type ?? undefined,
                totalArea: context.farm.totalArea,
            }
          : null;

    return (
        <AppShell
            variant="app"
            activeNav="/parametres"
            farm={farm}
            user={{ name: user.name, role: user.role ?? 'Membre', initials: user.initials }}
            unreadAlerts={context.unreadAlerts}
            title="Paramètres"
            subtitle="Profil, sécurité et préférences de votre compte"
        >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
                <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
                    {data ? <AccountSummary user={data.user} farm={data.farm} /> : <SummarySkeleton />}

                    <nav aria-label="Sections des paramètres" className="rounded-2xl border border-ink-100 bg-white p-2 shadow-soft">
                        {TABS.map((item) => {
                            const Icon = item.icon;
                            const active = tab === item.id;

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => selectTab(item.id)}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                                        active
                                            ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-100'
                                            : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg',
                                            active ? 'bg-white text-brand-700 ring-1 ring-brand-100' : 'bg-ink-50 text-ink-400',
                                        )}
                                    >
                                        <Icon aria-hidden="true" className="size-4" />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold">{item.label}</span>
                                        <span className="block text-[0.6875rem] text-ink-400">{item.description}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                <div className="min-w-0 space-y-4">
                    {state.status === 'loading' && <ContentSkeleton />}

                    {state.status === 'error' && (
                        <ErrorState
                            title="Paramètres indisponibles"
                            description={state.message}
                            onRetry={() => void load()}
                        />
                    )}

                    {state.status === 'ready' && (
                        <>
                            {tab === 'profil' && <ProfileForm user={state.data.user} onSaved={updateUser} />}

                            {tab === 'securite' && (
                                <>
                                    <PasswordForm />
                                    <SessionsCard user={state.data.user} />
                                </>
                            )}

                            {tab === 'exploitation' &&
                                (state.data.farm ? (
                                    <FarmForm farm={state.data.farm} onSaved={updateFarm} />
                                ) : (
                                    <NoFarmCard />
                                ))}

                            {tab === 'notifications' && (
                                <NotificationsForm
                                    preferences={state.data.user.preferences}
                                    onSaved={updatePreferences}
                                />
                            )}

                            {tab === 'apparence' && (
                                <AppearanceForm
                                    preferences={state.data.user.preferences}
                                    onSaved={updatePreferences}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </AppShell>
    );
}

function AccountSummary({ user, farm }: { user: SettingsUser; farm: SettingsFarm | null }) {
    return (
        <section className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
            <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-water-700 p-5 text-white">
                <div className="flex items-center gap-3">
                    <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/15 text-lg font-bold ring-1 ring-white/25 backdrop-blur">
                        {user.initials}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate font-display text-lg font-bold tracking-tight">{user.name}</p>
                        <p className="text-sm text-white/70">{user.roleLabel ?? 'Membre'}</p>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant={user.isActive ? 'onDark' : 'danger'} size="sm">
                        {user.isActive ? 'Compte actif' : 'Compte désactivé'}
                    </Badge>
                    <Badge variant={user.emailVerified ? 'onDark' : 'warning'} size="sm">
                        {user.emailVerified ? 'E-mail vérifié' : 'E-mail non vérifié'}
                    </Badge>
                </div>
            </div>

            <div className="space-y-3 p-5 text-sm">
                <p className="flex items-center gap-2 text-ink-600">
                    <Mail aria-hidden="true" className="size-4 shrink-0 text-ink-400" />
                    <span className="truncate">{user.email}</span>
                </p>

                {user.phone && (
                    <p className="flex items-center gap-2 text-ink-600">
                        <Phone aria-hidden="true" className="size-4 shrink-0 text-ink-400" />
                        <span className="truncate">{user.phone}</span>
                    </p>
                )}

                <p className="flex items-center gap-2 text-ink-600">
                    <Tractor aria-hidden="true" className="size-4 shrink-0 text-ink-400" />
                    <span className="truncate">{farm?.name ?? 'Aucune exploitation'}</span>
                </p>

                {farm?.location && (
                    <p className="flex items-center gap-2 text-ink-600">
                        <MapPin aria-hidden="true" className="size-4 shrink-0 text-ink-400" />
                        <span className="truncate">{farm.location}</span>
                    </p>
                )}

                <div className="space-y-1 border-t border-ink-100 pt-3 text-xs text-ink-500">
                    <p>Membre depuis {user.createdAt ? formatDate(user.createdAt) : '—'}</p>
                    <p>
                        Dernière connexion :{' '}
                        {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : 'jamais'}
                    </p>
                </div>

                <a
                    href="/exploitations"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                >
                    Voir les exploitations
                    <ArrowUpRight aria-hidden="true" className="size-3.5" />
                </a>
            </div>
        </section>
    );
}

function NoFarmCard() {
    return (
        <section className="rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center shadow-soft">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                <Tractor aria-hidden="true" className="size-6" />
            </span>
            <h2 className="mt-3 font-display text-lg font-bold text-ink-900">Aucune exploitation associée</h2>
            <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink-500">
                Votre compte n’est rattaché à aucune exploitation. Créez-en une ou demandez à un administrateur de vous y rattacher.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
                <a href="/exploitations">Ouvrir les exploitations</a>
            </Button>
        </section>
    );
}

function SummarySkeleton() {
    return (
        <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
            <div className="h-36 animate-pulse bg-ink-100" />
            <div className="space-y-3 p-5">
                <div className="h-3 w-3/4 animate-pulse rounded bg-ink-100" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-ink-100" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-ink-100" />
            </div>
        </div>
    );
}

function ContentSkeleton() {
    return (
        <div aria-hidden="true" className="space-y-4">
            <div className="h-52 animate-pulse rounded-2xl border border-ink-100 bg-white" />
            <div className="h-40 animate-pulse rounded-2xl border border-ink-100 bg-white" />
        </div>
    );
}

function readTab(): SettingsTab {
    const hash = window.location.hash.replace('#', '');

    return TABS.some((tab) => tab.id === hash) ? (hash as SettingsTab) : 'profil';
}
