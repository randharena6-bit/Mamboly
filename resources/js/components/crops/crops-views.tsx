import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import type { ResourceRow } from '../../resources/types';
import { fetchCropLayers, type CropLayers } from './crops-data';

const Plots3D = lazy(() => import('../plots/plots-3d').then((module) => ({ default: module.Plots3D })));
const CropsGallery3D = lazy(() =>
    import('./crops-gallery-3d').then((module) => ({ default: module.CropsGallery3D })),
);

const LAYERS_REFRESH_MS = 60_000;
const NO_WATER: ResourceRow[] = [];

function Loading({ label }: { label: string }) {
    return (
        <div className="grid h-[calc(100dvh-11rem)] min-h-[600px] place-items-center rounded-3xl border border-ink-100 bg-white text-sm text-ink-500">
            {label}
        </div>
    );
}

function useCropLayers(): CropLayers {
    const [layers, setLayers] = useState<CropLayers>({ plots: [], campaigns: [] });
    const firstLoad = useRef(true);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const next = await fetchCropLayers();
                if (cancelled) return;

                setLayers((previous) =>
                    JSON.stringify([previous.plots, previous.campaigns]) === JSON.stringify([next.plots, next.campaigns])
                        ? previous
                        : next,
                );
            } catch {
                if (firstLoad.current && !cancelled) {
                    setLayers({ plots: [], campaigns: [] });
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

export function Crops3DView({ rows }: { rows: ResourceRow[] }) {
    const layers = useCropLayers();

    return (
        <Suspense fallback={<Loading label="Chargement de la carte des cultures…" />}>
            <Plots3D
                rows={layers.plots}
                waterSources={NO_WATER}
                campaigns={layers.campaigns}
                crops={rows}
                heading="Cultures AgriWater"
                subheading="Carte des cultures au champ"
                showCropFilter
            />
        </Suspense>
    );
}

export function CropsGalleryView({ rows }: { rows: ResourceRow[] }) {
    return (
        <Suspense fallback={<Loading label="Chargement de la galerie des cultures…" />}>
            <CropsGallery3D rows={rows} />
        </Suspense>
    );
}
