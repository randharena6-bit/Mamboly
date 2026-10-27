import { AlertCircle, ArrowLeft, Pencil, RefreshCw, Tractor, Trash2, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { AppShell } from '../components/dashboard/app-shell';
import { Badge } from '../components/ui/badge';
import { ErrorState } from '../components/landing/states';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { cn } from '../lib/cn';
import { goTo } from '../lib/forms';
import type { FarmShowPayload } from '../types/farm';

type LoadState =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; payload: FarmShowPayload };

export function FarmShowPage({ endpoint, farmName }: { endpoint: string; farmName?: string }) {
    const [state, setState] = useState<LoadState>({ status: 'loading' });
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(
        async (signal: AbortSignal) => {
            try {
                const response = await fetch(endpoint, {
                    signal,
                    credentials: 'same-origin',
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                });

                if (response.status === 401 || response.status === 403) {
                    window.location.assign('/login');
                    return;
                }

                if (!response.ok) {
                    setState({
                        status: 'error',
                        message: `Impossible de charger l'exploitation (erreur ${response.status}).`,
                    });
                    return;
                }

                setState({ status: 'ready', payload: (await response.json()) as FarmShowPayload });
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') return;
                setState({
                    status: 'error',
                    message: 'Le serveur n’a pas répondu. Vérifiez votre connexion puis réessayez.',
                });
            }
        },
        [endpoint],
    );

    useEffect(() => {
        const controller = new AbortController();
        void load(controller.signal);
        return () => controller.abort();
    }, [load]);

    const handleDelete = async () => {
        if (!(state.status === 'ready')) return;
        setDeleting(true);

        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

        try {
            const response = await fetch(`/exploitations/${state.payload.farm.id}`, {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': token ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                setDeleting(false);
                setConfirmDelete(false);
                return;
            }

            goTo(payload?.redirect ?? '/exploitations');
        } catch (error) {
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    const name = farmName ?? (state.status === 'ready' ? state.payload.farm.name : 'Exploitation');

    if (state.status === 'loading') {
        return (
            <AppShell
                activeNav="/exploitations"
                user={{ name: 'Chargement…', role: '', initials: 'AW' }}
                title={name}
                subtitle="Chargement des données…"
                variant="app"
            >
                <Card>
                    <CardContent className="py-10 text-center text-sm text-ink-500">
                        Chargement en cours…
                    </CardContent>
                </Card>
            </AppShell>
        );
    }

    if (state.status === 'error') {
        return (
            <div className="app-backdrop grid min-h-screen place-items-center px-4 py-16">
                <div className="flex w-full max-w-lg flex-col items-center gap-6 rounded-3xl border border-ink-100 bg-white px-6 py-14 text-center shadow-lift">
                    <ErrorState icon={AlertCircle} title="Page indisponible" description={state.message} />
                    <div className="flex flex-wrap justify-center gap-2">
                        <Button asChild variant="outline">
                            <a href="/exploitations">
                                <ArrowLeft aria-hidden="true" className="size-4" />
                                Retour aux exploitations
                            </a>
                        </Button>
                        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
                            <RefreshCw aria-hidden="true" className="size-4" />
                            Réessayer
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const payload = state.payload;
    const farm = payload.farm;
    const user = payload.user;
    const canManage = payload.canManage ?? false;

    return (
        <>
            <AppShell
                activeNav="/exploitations"
                user={{ name: user.name ?? 'Utilisateur', role: user.role ?? '', initials: user.initials }}
                title={farm.name}
                subtitle={farm.location ?? 'Localisation non renseignée'}
                variant="app"
            >
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Button asChild variant="outline" size="sm">
                            <a href="/exploitations">
                                <ArrowLeft aria-hidden="true" className="size-4" />
                                Retour aux exploitations
                            </a>
                        </Button>

                        {canManage && (
                            <div className="flex items-center gap-2">
                                <Button asChild variant="outline" size="sm">
                                    <a href={`/exploitations/${farm.id}/edit`}>
                                        <Pencil aria-hidden="true" className="size-4" />
                                        Modifier
                                    </a>
                                </Button>
                                <Button
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setConfirmDelete(true)}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    <Trash2 aria-hidden="true" className="size-4" />
                                    Supprimer
                                </Button>
                            </div>
                        )}
                    </div>

                    <Card className="overflow-hidden">
                        <span aria-hidden="true" className="block h-1 bg-gradient-to-r from-brand-600 via-brand-400 to-water-500" />
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-50 to-water-50 text-brand-700 ring-1 ring-brand-100">
                                        <Tractor className="size-5" />
                                    </span>
                                    <div>
                                        <CardTitle>Détail de l’exploitation</CardTitle>
                                        <p className="mt-0.5 text-sm text-ink-500">
                                            {farm.type ?? 'Type non renseigné'}
                                            {farm.createdAt
                                                ? ` · créée le ${new Date(farm.createdAt).toLocaleDateString('fr-FR')}`
                                                : ''}
                                        </p>
                                    </div>
                                </div>
                                <Badge
                                    variant={
                                        farm.status === 'active'
                                            ? 'brand'
                                            : farm.status === 'pending'
                                              ? 'warning'
                                              : 'outline'
                                    }
                                    size="md"
                                >
                                    {farm.status === 'active'
                                        ? 'Active'
                                        : farm.status === 'pending'
                                          ? 'En attente'
                                          : 'Inactive'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                                <FarmStat
                                    label="Superficie"
                                    value={farm.totalArea != null ? `${farm.totalArea} ha` : '—'}
                                />
                                <FarmStat
                                    label="Parcelles"
                                    value={`${farm.counts.plots}`}
                                    hint={`${farm.counts.plotsInCrop} en culture`}
                                />
                                <FarmStat
                                    label="Campagnes"
                                    value={`${farm.counts.campaigns}`}
                                    hint={`${farm.counts.campaignsActive} actives`}
                                />
                                <FarmStat label="Sources d’eau" value={`${farm.counts.waterSources}`} />
                                <FarmStat
                                    label="Valeur du stock"
                                    value={`${farm.metrics.stockValue.toLocaleString('fr-FR')} MGA`}
                                />
                                <FarmStat
                                    label="Dépenses du mois"
                                    value={`${farm.metrics.monthExpenses.toLocaleString('fr-FR')} MGA`}
                                />
                                <FarmStat
                                    label="Recettes du mois"
                                    value={`${farm.metrics.monthRevenues.toLocaleString('fr-FR')} MGA`}
                                />
                                <FarmStat
                                    label="Eau disponible"
                                    value={`${farm.metrics.waterAvailable.toLocaleString('fr-FR')} L`}
                                />
                                <FarmStat
                                    label="Alertes non lues"
                                    value={`${farm.unreadAlerts}`}
                                    alert={farm.unreadAlerts > 0}
                                />
                            </dl>
                        </CardContent>
                    </Card>

                    {farm.team.members?.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="size-4 text-brand-600" />
                                    Équipe ({farm.team.count})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="grid gap-2 sm:grid-cols-2">
                                    {farm.team.members.map((member) => (
                                        <li
                                            key={member.id}
                                            className="flex items-start gap-3 rounded-xl border border-ink-100 bg-white p-3"
                                        >
                                            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-[0.6875rem] font-bold text-white">
                                                {initials(member.name)}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate text-sm font-semibold text-ink-900">{member.name}</p>
                                                    <span
                                                        className={cn(
                                                            'size-1.5 shrink-0 rounded-full',
                                                            member.isActive ? 'bg-brand-500' : 'bg-ink-300',
                                                        )}
                                                        title={member.isActive ? 'Compte actif' : 'Compte inactif'}
                                                    />
                                                </div>
                                                <p className="truncate text-xs text-ink-500">{member.email}</p>
                                                <p className="mt-1 text-[0.625rem] text-ink-400">
                                                    {member.role}
                                                    {' · '}
                                                    {member.lastLoginAt
                                                        ? `vu le ${new Date(member.lastLoginAt).toLocaleDateString('fr-FR')}`
                                                        : 'jamais connecté'}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {farm.campaigns.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Campagnes en cours / prévues</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="grid gap-2 sm:grid-cols-2">
                                    {farm.campaigns.map((campaign) => (
                                        <li key={campaign.id} className="rounded-xl border border-ink-100 bg-white p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-semibold text-ink-900">{campaign.name}</p>
                                                <Badge variant="outline" size="sm">
                                                    {campaign.status}
                                                </Badge>
                                            </div>
                                            <p className="mt-1 text-xs text-ink-500">
                                                {campaign.cropName ?? 'Culture non renseignée'}
                                                {campaign.plotName ?? campaign.plotCode
                                                    ? ` · ${campaign.plotName ?? campaign.plotCode}`
                                                    : ''}
                                            </p>
                                            <p className="mt-1 text-[0.625rem] font-semibold text-ink-400">
                                                Surface : {campaign.area} m²
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </AppShell>

            <ConfirmDialog
                open={confirmDelete}
                title={`Supprimer « ${farm.name} »`}
                description="Toutes les données de l'exploitation — parcelles, campagnes, stocks, eau, finances et alertes — seront définitivement supprimées. Cette action est irréversible."
                confirmLabel="Supprimer"
                busy={deleting}
                onConfirm={handleDelete}
                onCancel={() => setConfirmDelete(false)}
            />
        </>
    );
}

function FarmStat({ label, value, hint, alert = false }: { label: string; value: string; hint?: string; alert?: boolean }) {
    return (
        <div className="rounded-xl border border-ink-100 bg-ink-50/40 px-3 py-2.5">
            <dt className="text-[0.625rem] font-bold tracking-[0.08em] text-ink-400 uppercase">{label}</dt>
            <dd className={cn('mt-1 text-sm font-semibold', alert ? 'text-harvest-700' : 'text-ink-900')}>
                {value}
            </dd>
            {hint && <p className="mt-0.5 text-[0.625rem] text-ink-400">{hint}</p>}
        </div>
    );
}

function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
}
