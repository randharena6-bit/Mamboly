import { AlertCircle, RefreshCw, Tractor } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { AppShell } from '../components/dashboard/app-shell';
import { ErrorState } from '../components/landing/states';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import type { FarmsOverviewPayload, FarmSummary } from '../types/farm';

type LoadState =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; payload: FarmsOverviewPayload };

export function FarmsPage({ endpoint }: { endpoint: string }) {
    const [state, setState] = useState<LoadState>({ status: 'loading' });

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

    if (state.status === 'loading') {
        return (
            <Frame>
                <AppShell
                    activeNav="/exploitations"
                    user={{ name: 'Chargement...', role: '', initials: 'AW' }}
                    title="Exploitations"
                    subtitle="Chargement des données..."
                    variant="app"
                >
                    <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
                        <p className="text-sm text-ink-500">Chargement en cours...</p>
                    </div>
                </AppShell>
            </Frame>
        );
    }

    if (state.status === 'error') {
        return (
            <Frame>
                <div className="flex flex-col items-center gap-6 rounded-2xl border border-ink-100 bg-white px-6 py-20 text-center shadow-soft">
                    <ErrorState
                        icon={AlertCircle}
                        title="Page indisponible"
                        description={state.message}
                    />
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

    return (
        <Frame>
            <AppShell
                activeNav="/exploitations"
                user={{ name: user.name ?? 'Utilisateur', role: user.role ?? '', initials: user.initials }}
                title="Exploitations"
                subtitle={
                    payload.mode === 'list'
                        ? `${payload.totals?.farms ?? 0} exploitation${(payload.totals?.farms ?? 0) > 1 ? 's' : ''} au total`
                        : payload.farm?.name ?? 'Mon exploitation'
                }
                variant="app"
            >
                {payload.mode === 'list' ? (
                    <FarmsList farms={payload.farms ?? []} />
                ) : payload.farm ? (
                    <FarmSingle farm={payload.farm} />
                ) : (
                    <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
                        <p className="text-sm text-ink-500">Aucune exploitation associée à votre compte.</p>
                    </div>
                )}
            </AppShell>
        </Frame>
    );
}

function FarmsList({ farms }: { farms: FarmSummary[] }) {
    if (farms.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Liste des exploitations</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-ink-500">Aucune exploitation enregistrée.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {farms.map((farm) => (
                <Card key={farm.id}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Tractor className="size-4 text-brand-600" />
                            <a href={`/exploitations/${farm.id}`} className="text-brand-700 hover:underline">
                                {farm.name}
                            </a>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-ink-600">
                        <p>Localisation : {farm.location ?? '—'}</p>
                        <p>Type : {farm.type ?? '—'}</p>
                        <p>Superficie : {farm.totalArea != null ? `${farm.totalArea} ha` : '—'}</p>
                        <p>Parcelles : {farm.counts.plots} (en culture : {farm.counts.plotsInCrop})</p>
                        <p>Campagnes actives : {farm.counts.campaignsActive}</p>
                        <p>Équipe : {farm.team.count}</p>
                        <p>Alertes non lues : {farm.unreadAlerts}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

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
