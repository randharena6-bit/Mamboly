import { AlertCircle, ArrowLeft, Pencil, RefreshCw, Tractor, Trash2, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { AppShell } from '../components/dashboard/app-shell';
import { ErrorState } from '../components/landing/states';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
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
            <Frame>
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
            </Frame>
        );
    }

    if (state.status === 'error') {
        return (
            <Frame>
                <div className="flex flex-col items-center gap-6 rounded-2xl border border-ink-100 bg-white px-6 py-20 text-center shadow-soft">
                    <ErrorState icon={AlertCircle} title="Page indisponible" description={state.message} />
                    <div className="flex gap-2">
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
            </Frame>
        );
    }

    const payload = state.payload;
    const farm = payload.farm;
    const user = payload.user;
    const canManage = payload.canManage ?? false;

    return (
        <Frame>
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

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Tractor className="size-4 text-brand-600" />
                                Détail de l'exploitation
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2 text-sm text-ink-600 sm:grid-cols-2 lg:grid-cols-3">
                            <p>Type : {farm.type ?? '—'}</p>
                            <p>Statut : {farm.status ?? '—'}</p>
                            <p>Superficie : {farm.totalArea != null ? `${farm.totalArea} ha` : '—'}</p>
                            <p>Parcelles : {farm.counts.plots} (en culture : {farm.counts.plotsInCrop})</p>
                            <p>Campagnes : {farm.counts.campaigns} (actives : {farm.counts.campaignsActive})</p>
                            <p>Sources d'eau : {farm.counts.waterSources}</p>
                            <p>Valeur stock : {farm.metrics.stockValue.toLocaleString('fr-FR')} MGA</p>
                            <p>Dépenses (mois) : {farm.metrics.monthExpenses.toLocaleString('fr-FR')} MGA</p>
                            <p>Recettes (mois) : {farm.metrics.monthRevenues.toLocaleString('fr-FR')} MGA</p>
                            <p>Eau disponible : {farm.metrics.waterAvailable.toLocaleString('fr-FR')} L</p>
                            <p>Alertes non lues : {farm.unreadAlerts}</p>
                            <p>Créée le : {farm.createdAt ? new Date(farm.createdAt).toLocaleDateString('fr-FR') : '—'}</p>
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
                                <ul className="space-y-2 text-sm">
                                    {farm.team.members.map((member) => (
                                        <li key={member.id} className="rounded-lg border border-ink-100 p-3">
                                            <p className="font-medium text-ink-900">{member.name}</p>
                                            <p className="text-ink-500">{member.email}</p>
                                            <p className="text-ink-500">
                                                Rôle : {member.role} — Actif : {member.isActive ? 'oui' : 'non'}
                                            </p>
                                            <p className="text-xs text-ink-400">
                                                Dernière connexion : {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString('fr-FR') : '—'}
                                            </p>
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
                                <ul className="space-y-2 text-sm">
                                    {farm.campaigns.map((campaign) => (
                                        <li key={campaign.id} className="rounded-lg border border-ink-100 p-3">
                                            <p className="font-medium text-ink-900">{campaign.name}</p>
                                            <p className="text-ink-500">Statut : {campaign.status}</p>
                                            <p className="text-ink-500">Culture : {campaign.cropName ?? '—'}</p>
                                            <p className="text-ink-500">Parcelle : {campaign.plotName ?? campaign.plotCode ?? '—'}</p>
                                            <p className="text-ink-500">Surface : {campaign.area} m²</p>
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
        </Frame>
    );
}

function Frame({ children }: { children: React.ReactNode }) {
    return <div className="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 lg:py-8">{children}</div>;
}