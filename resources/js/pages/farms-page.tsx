import { AlertCircle, Factory, Plus, RefreshCw, Tractor } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { AppShell } from '../components/dashboard/app-shell';
import { FarmListCard } from '../components/farms/farm-list-card';
import { FarmStats } from '../components/farms/farm-stats';
import { EmptyState, ErrorState } from '../components/landing/states';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { goTo } from '../lib/forms';
import type { FarmsOverviewPayload, FarmSummary } from '../types/farm';

type LoadState =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; payload: FarmsOverviewPayload };

/**
 * Page Exploitations — vue hybride :
 *  - l'administrateur global supervise toutes les exploitations (mode liste),
 *    avec indicateurs transversaux et actions de création / modification /
 *    suppression ;
 *  - tout autre compte retrouve sa propre exploitation (mode fiche).
 */
export function FarmsPage({ endpoint }: { endpoint: string }) {
    const [state, setState] = useState<LoadState>({ status: 'loading' });
    const [pendingDeletion, setPendingDeletion] = useState<FarmSummary | null>(null);
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
                        message: `Impossible de charger les exploitations (erreur ${response.status}).`,
                    });
                    return;
                }

                setState({ status: 'ready', payload: (await response.json()) as FarmsOverviewPayload });
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

    const confirmDeletion = async () => {
        if (!pendingDeletion) return;
        setDeleting(true);

        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

        try {
            const response = await fetch(`/exploitations/${pendingDeletion.id}`, {
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
                setPendingDeletion(null);
                return;
            }

            goTo(payload?.redirect ?? '/exploitations');
        } catch (error) {
            setDeleting(false);
            setPendingDeletion(null);
        }
    };

    if (state.status === 'loading') {
        return (
            <Frame>
                <AppShell
                    activeNav="/exploitations"
                    user={{ name: 'Chargement…', role: '', initials: 'AW' }}
                    title="Exploitations"
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
                    <Button type="button" variant="outline" onClick={() => window.location.reload()}>
                        <RefreshCw aria-hidden="true" className="size-4" />
                        Réessayer
                    </Button>
                </div>
            </Frame>
        );
    }

    const payload = state.payload;
    const user = payload.user;
    const canManage = payload.canManage ?? false;

    return (
        <Frame>
            <AppShell
                activeNav="/exploitations"
                user={{ name: user.name ?? 'Utilisateur', role: user.role ?? '', initials: user.initials }}
                title="Exploitations"
                subtitle={
                    payload.mode === 'list'
                        ? `Supervision de ${payload.totals?.farms ?? 0} exploitation${(payload.totals?.farms ?? 0) > 1 ? 's' : ''}`
                        : payload.farm?.name ?? 'Mon exploitation'
                }
                variant="app"
            >
                {payload.mode === 'list' ? (
                    <FarmOverview
                        farms={payload.farms ?? []}
                        totals={payload.totals}
                        canManage={canManage}
                        onDelete={setPendingDeletion}
                    />
                ) : payload.farm ? (
                    <FarmSingle farm={payload.farm} />
                ) : (
                    <Card>
                        <CardContent className="py-10">
                            <p className="text-center text-sm text-ink-500">
                                Aucune exploitation associée à votre compte.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </AppShell>

            <ConfirmDialog
                open={pendingDeletion !== null}
                title={pendingDeletion ? `Supprimer « ${pendingDeletion.name} »` : 'Supprimer'}
                description="Toutes les données de l'exploitation — parcelles, campagnes, stocks, eau, finances et alertes — seront définitivement supprimées. Cette action est irréversible."
                confirmLabel="Supprimer"
                busy={deleting}
                onConfirm={confirmDeletion}
                onCancel={() => setPendingDeletion(null)}
            />
        </Frame>
    );
}

/** Mode liste : bandeau d'indicateurs puis cartes des exploitations. */
function FarmOverview({
    farms,
    totals,
    canManage,
    onDelete,
}: {
    farms: FarmSummary[];
    totals?: FarmsOverviewPayload['totals'];
    canManage: boolean;
    onDelete: (farm: FarmSummary) => void;
}) {
    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-500">
                    {farms.length} exploitation{farms.length > 1 ? 's' : ''} enregistrée{farms.length > 1 ? 's' : ''}
                </p>
                {canManage && (
                    <Button asChild>
                        <a href="/exploitations/create">
                            <Plus aria-hidden="true" className="size-4" />
                            Nouvelle exploitation
                        </a>
                    </Button>
                )}
            </div>

            {totals && <FarmStats totals={totals} />}

            {farms.length === 0 ? (
                <EmptyState
                    icon={Factory}
                    title="Aucune exploitation enregistrée"
                    description="Créez la première exploitation pour commencer à piloter votre activité avec AgriWater."
                />
            ) : (
                <div className="space-y-3">
                    {farms.map((farm) => (
                        <FarmListCard key={farm.id} farm={farm} canManage={canManage} onDelete={onDelete} />
                    ))}
                </div>
            )}
        </div>
    );
}

/** Mode fiche (compte non-administrateur) : l'essentiel de son exploitation. */
function FarmSingle({ farm }: { farm: FarmSummary }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Tractor className="size-4 text-brand-600" />
                    {farm.name}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-ink-600">
                <p>Localisation : {farm.location ?? '—'}</p>
                <p>Type : {farm.type ?? '—'}</p>
                <p>Superficie : {farm.totalArea != null ? `${farm.totalArea} ha` : '—'}</p>
                <p>Parcelles : {farm.counts.plots} (en culture : {farm.counts.plotsInCrop})</p>
                <p>Campagnes : {farm.counts.campaigns} (actives : {farm.counts.campaignsActive})</p>
                <p>Sources d'eau : {farm.counts.waterSources}</p>
                <p>Valeur stock : {farm.metrics.stockValue.toLocaleString('fr-FR')} MGA</p>
                <p>Alertes non lues : {farm.unreadAlerts}</p>
                <p>
                    <a href={`/exploitations/${farm.id}`} className="text-brand-700 hover:underline">
                        Voir la fiche complète
                    </a>
                </p>
            </CardContent>
        </Card>
    );
}

function Frame({ children }: { children: React.ReactNode }) {
    return <div className="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 lg:py-8">{children}</div>;
}