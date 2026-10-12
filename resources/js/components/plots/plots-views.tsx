import { lazy, Suspense, useEffect, useState } from 'react';

import type { ResourceRow } from '../../resources/types';
import { fetchMapLayers } from './plots-data';

const PlotsMap = lazy(() => import('./plots-map').then((module) => ({ default: module.PlotsMap })));
const Plots3D = lazy(() => import('./plots-3d').then((module) => ({ default: module.Plots3D })));

type Layers = { waterSources: ResourceRow[]; irrigations: ResourceRow[] };

function Loading() {
    return (
        <div className="grid h-[560px] place-items-center rounded-2xl border border-ink-100 bg-white text-sm text-ink-500">
            Chargement de la vue…
        </div>
    );
}

function useLayers(): Layers {
    const [layers, setLayers] = useState<Layers>({ waterSources: [], irrigations: [] });

    useEffect(() => {
        void fetchMapLayers()
            .then(setLayers)
            .catch(() => setLayers({ waterSources: [], irrigations: [] }));
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
            <Plots3D rows={rows} waterSources={layers.waterSources} />
        </Suspense>
    );
}
