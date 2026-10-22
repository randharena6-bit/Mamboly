import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import type { ResourceRow } from '../../resources/types';
import { fetchMapLayers } from './plots-data';

const PlotsMap = lazy(() => import('./plots-map').then((module) => ({ default: module.PlotsMap })));
const Plots3D = lazy(() => import('./plots-3d').then((module) => ({ default: module.Plots3D })));

type Layers = { waterSources: ResourceRow[]; irrigations: ResourceRow[] };

/** Actualisation périodique des couches (points d'eau, irrigations). */
const LAYERS_REFRESH_MS = 60_000;

function Loading() {
    return (
        <div className="grid h-[560px] place-items-center rounded-2xl border border-ink-100 bg-white text-sm text-ink-500">
            Chargement de la vue…
        </div>
    );
}

function useLayers(): Layers {
    const [layers, setLayers] = useState<Layers>({ waterSources: [], irrigations: [] });
    const firstLoad = useRef(true);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const next = await fetchMapLayers();
                if (cancelled) return;

                // Aucune reconstruction de scène si le contenu n'a pas bougé.
                setLayers((previous) =>
                    JSON.stringify([previous.waterSources, previous.irrigations]) ===
                    JSON.stringify([next.waterSources, next.irrigations])
                        ? previous
                        : next,
                );
            } catch {
                // On conserve la dernière réponse connue plutôt que de vider la scène.
                if (firstLoad.current && !cancelled) {
                    setLayers({ waterSources: [], irrigations: [] });
                }
            } finally {
                firstLoad.current = false;
            }
        };

        void load();
        const timer = window.setInterval(() => void load(), LAYERS_REFRESH_MS);

        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, []);

    return layers;
}

export function PlotsMapView({ rows }: { rows: ResourceRow[] }) {
    const layers = useLayers();
    const [selected, setSelected] = useState<string | number | null>(null);

    return (
        <Suspense fallback={<Loading />}>
            <PlotsMap
                rows={rows}
                waterSources={layers.waterSources}
                irrigations={layers.irrigations}
                selectedId={selected}
                onSelect={setSelected}
            />
        </Suspense>
    );
}

export function Plots3DView({ rows }: { rows: ResourceRow[] }) {
    const layers = useLayers();

    return (
        <Suspense fallback={<Loading />}>
            <Plots3D rows={rows} waterSources={layers.waterSources} irrigations={layers.irrigations} />
        </Suspense>
    );
}
