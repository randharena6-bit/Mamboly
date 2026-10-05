import { AlertCircle, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { DashboardFull } from '../components/dashboard/dashboard-full';
import { ErrorState } from '../components/landing/states';
import { Button } from '../components/ui/button';
import { demoDashboardView, toDashboardView, type DashboardPayload, type DashboardViewData } from '../data/dashboard';

/**
 * Tableau de bord connecté — données réelles de l'exploitation.
 *
 * L'écran charge le payload depuis la session de l'utilisateur puis délègue son
 * rendu à `DashboardFull`, identique à l'aperçu de la page d'accueil. Les états
 * de chargement et d'erreur sont portés ici : les panneaux reçoivent ensuite un
 * jeu de données complet.
 */
type LoadState =
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; data: DashboardViewData };

export function DashboardPage({ endpoint }: { endpoint: string }) {
    const [state, setState] = useState<LoadState>({ status: 'loading' });

    const load = useCallback(
        async (signal: AbortSignal) => {
            try {
                const response = await fetch(endpoint, {
                    signal,
                    credentials: 'same-origin',
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                });

                // La session a expiré ou l'utilisateur n'a plus accès : la page
                // de connexion prend le relais plutôt que d'afficher une erreur.
                if (response.status === 401 || response.status === 403) {
                    window.location.assign('/login');
                    return;
                }

                if (!response.ok) {
                    setState({
                        status: 'error',
                        message: `Les données de votre exploitation n’ont pas pu être chargées (erreur ${response.status}).`,
                    });
                    return;
                }

                setState({
                    status: 'ready',
                    data: toDashboardView((await response.json()) as DashboardPayload),
                });
            } catch (error) {
                // Une requête annulée au démontage n'est pas une panne à afficher.
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
                {/* Les fixtures ne servent qu'à endowed la silhouette des panneaux. */}
                <DashboardFull data={demoDashboardView} view="loading" variant="app" />
            </Frame>
        );
    }

    if (state.status === 'error') {
        return (
            <Frame>
                <div className="flex flex-col items-center gap-6 rounded-2xl border border-ink-100 bg-white px-6 py-20 text-center shadow-soft">
                    <ErrorState
                        icon={AlertCircle}
                        title="Tableau de bord indisponible"
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

    return (
        <Frame>
            <DashboardFull data={state.data} variant="app" />
        </Frame>
    );
}

/** Centrage et gouttières communs aux trois états. */
function Frame({ children }: { children: React.ReactNode }) {
    return <div className="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 lg:py-8">{children}</div>;
}
