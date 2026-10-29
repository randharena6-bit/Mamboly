import {
    Compass,
    Crosshair,
    Droplets,
    Maximize2,
    Minimize2,
    MousePointer2,
    Pause,
    Play,
    RotateCcw,
    Sprout,
    Wheat,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { ResourceRow } from '../../resources/types';
import { humanize } from '../app/status-badge';
import { cropPalette } from '../plots/farm3d/core';
import { CropGallery } from './crops-gallery';

const MAX_SPECIMENS = 20;

export function CropsGallery3D({ rows }: { rows: ResourceRow[] }) {
    const wrapper = useRef<HTMLDivElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null);
    const gallery = useRef<CropGallery | null>(null);
    const autoRotateRef = useRef(true);

    const dataRef = useRef(rows);
    dataRef.current = rows;
    const dataKey = useMemo(() => JSON.stringify(rows), [rows]);

    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<ResourceRow | null>(null);
    const [autoRotate, setAutoRotate] = useState(true);
    const [fullscreen, setFullscreen] = useState(false);

    autoRotateRef.current = autoRotate;

    useEffect(() => {
        const element = canvas.current;
        if (!element) return;

        setReady(false);
        setError(null);
        setSelected(null);

        let instance: CropGallery;

        try {
            instance = new CropGallery({
                canvas: element,
                rows: dataRef.current,
                onSelect: (next) => setSelected(next),
                onReady: () => setReady(true),
            });
        } catch {
            setError('Impossible de démarrer la galerie 3D. Vérifiez que WebGL est activé dans votre navigateur.');
            return;
        }

        gallery.current = instance;
        instance.setAutoRotate(autoRotateRef.current);

        return () => {
            instance.dispose();
            gallery.current = null;
        };
    }, [dataKey]);

    useEffect(() => {
        gallery.current?.setAutoRotate(autoRotate);
    }, [autoRotate]);

    useEffect(() => {
        const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
        document.addEventListener('fullscreenchange', onChange);

        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);

    const maxWater = useMemo(
        () => Math.max(1, ...rows.map((row) => Number(row.water_requirement ?? 0))),
        [rows],
    );
    const visibleRows = rows.slice(0, MAX_SPECIMENS);
    const selectedPalette = selected ? cropPalette(selected) : null;
    const selectedRatio = selected
        ? Math.min(100, Math.max(8, (Number(selected.water_requirement ?? 0) / maxWater) * 100))
        : 0;

    const toggleFullscreen = async () => {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await wrapper.current?.requestFullscreen();
            }
        } catch {
            // Le plein écran peut être refusé par le navigateur.
        }
    };

    const reset = () => {
        gallery.current?.resetView();
        setSelected(null);
    };

    const focus = (crop: ResourceRow) => {
        gallery.current?.focusCrop(String(crop.id));
    };

    return (
        <div
            ref={wrapper}
            className={`relative overflow-hidden bg-[#070d18] shadow-[0_30px_80px_-30px_rgba(15,23,42,0.75)] ${
                fullscreen
                    ? 'h-screen min-h-0 rounded-none border-0'
                    : 'h-[calc(100dvh-11rem)] min-h-[600px] rounded-3xl border border-slate-700/60'
            }`}
        >
            <canvas ref={canvas} className="absolute inset-0 h-full w-full touch-none outline-none" />

            {!ready && !error && (
                <div className="absolute inset-0 z-30 grid place-items-center bg-[#070d18]">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <span className="grid size-14 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10">
                            <Sprout className="size-7 animate-pulse text-emerald-300" />
                        </span>
                        <div>
                            <p className="font-display text-lg font-semibold text-white">Composition de la galerie</p>
                            <p className="mt-1 text-sm text-slate-400">Cultures, besoins en eau et silhouettes…</p>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 z-30 grid place-items-center bg-[#070d18] p-6">
                    <div className="max-w-md rounded-2xl border border-rose-400/30 bg-rose-500/10 p-6 text-center">
                        <p className="font-display text-lg font-semibold text-white">Galerie 3D indisponible</p>
                        <p className="mt-2 text-sm text-rose-100/80">{error}</p>
                    </div>
                </div>
            )}

            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4">
                <div className="pointer-events-auto flex min-w-0 items-center gap-3 rounded-2xl border border-white/15 bg-slate-950/70 px-3 py-2.5 shadow-xl backdrop-blur-xl">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-emerald-400/30 bg-emerald-500/15">
                        <Sprout className="size-5 text-emerald-300" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">Galerie AgriWater</p>
                        <p className="truncate font-display text-sm font-semibold text-white">Catalogue des cultures</p>
                    </div>
                    <span className="hidden shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/70 sm:inline">
                        {visibleRows.length}/{rows.length}
                    </span>
                </div>

                <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-white/15 bg-slate-950/70 p-1 shadow-xl backdrop-blur-xl">
                    <button
                        type="button"
                        onClick={() => setAutoRotate((current) => !current)}
                        className="grid size-9 place-items-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
                        aria-label={autoRotate ? 'Mettre la rotation en pause' : 'Relancer la rotation'}
                        title={autoRotate ? 'Pause' : 'Rotation automatique'}
                    >
                        {autoRotate ? <Pause className="size-4" /> : <Play className="size-4" />}
                    </button>
                    <button
                        type="button"
                        onClick={reset}
                        className="grid size-9 place-items-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
                        aria-label="Recentrer la galerie"
                        title="Recentrer"
                    >
                        <RotateCcw className="size-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => void toggleFullscreen()}
                        className="grid size-9 place-items-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
                        aria-label={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
                        title={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
                    >
                        {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                    </button>
                </div>
            </div>

            <div className="pointer-events-none absolute top-20 right-3 z-20 w-[21rem] max-w-[calc(100%-1.5rem)] sm:top-24">
                <div className="pointer-events-auto overflow-hidden rounded-2xl border border-white/15 bg-slate-950/72 text-white shadow-2xl backdrop-blur-xl">
                    {selected && selectedPalette ? (
                        <div>
                            <div
                                className="border-b border-white/10 p-4"
                                style={{ background: `linear-gradient(135deg, ${selectedPalette.css}33, transparent 72%)` }}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: selectedPalette.css }}>
                                            {humanize(String(selected.category ?? 'Culture'))}
                                        </p>
                                        <p className="mt-1 truncate font-display text-lg font-semibold">{String(selected.name ?? 'Culture')}</p>
                                        <p className="mt-0.5 text-xs text-white/50">#{String(selected.id)}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => gallery.current?.clearSelection()}
                                        className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                                        aria-label="Fermer"
                                    >
                                        <X className="size-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 p-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <Detail label="Durée" value={`${String(selected.estimated_duration_days ?? '—')} jours`} />
                                    <Detail label="Unité" value={String(selected.production_unit ?? '—')} />
                                    <Detail label="Catégorie" value={humanize(String(selected.category ?? '—'))} />
                                    <Detail label="Statut" value={humanize(String(selected.status ?? '—'))} />
                                </div>

                                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/45">
                                            <Droplets className="size-3.5 text-sky-300" />
                                            Besoin en eau
                                        </p>
                                        <p className="font-display text-sm font-semibold tabular-nums">
                                            {String(selected.water_requirement ?? '—')} L/m²
                                        </p>
                                    </div>
                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                                        <div
                                            className="h-full rounded-full bg-sky-400"
                                            style={{ width: `${selectedRatio}%` }}
                                        />
                                    </div>
                                    <p className="mt-1.5 text-[10px] text-white/40">Comparé à la culture la plus gourmande du catalogue affiché.</p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => gallery.current?.focusCrop(String(selected.id))}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-400"
                                >
                                    <Crosshair className="size-4" />
                                    Recentrer sur la culture
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Catalogue</p>
                                    <p className="font-display text-base font-semibold">Explorer les cultures</p>
                                </div>
                                <span className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-emerald-300">
                                    <Compass className="size-4" />
                                </span>
                            </div>

                            <p className="mt-3 text-xs leading-relaxed text-white/55">
                                Chaque spécimen est dimensionné par sa durée et sa jauge bleue compare son besoin en eau.
                            </p>

                            <div className="mt-3 max-h-56 space-y-1 overflow-y-auto pr-1">
                                {visibleRows.map((crop) => {
                                    const palette = cropPalette(crop);

                                    return (
                                        <button
                                            key={String(crop.id)}
                                            type="button"
                                            onClick={() => focus(crop)}
                                            className="flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
                                        >
                                            <span className="flex min-w-0 items-center gap-2">
                                                <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: palette.css }} />
                                                <span className="truncate font-semibold">{String(crop.name ?? 'Culture')}</span>
                                            </span>
                                            <span className="shrink-0 tabular-nums text-[10px] text-white/40">
                                                {String(crop.water_requirement ?? 0)} L/m²
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-100/80">
                                <MousePointer2 className="mt-0.5 size-4 shrink-0" />
                                <p>Cliquez sur un plant ou sur une culture de la liste pour l’isoler.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 md:block">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/55 px-3 py-1.5 text-[11px] text-white/60 backdrop-blur">
                    <Wheat className="size-3.5 text-emerald-300" />
                    Glisser pour tourner · Molette pour zoomer · Cliquer pour isoler
                </div>
            </div>
        </div>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
            <p className="text-[9px] font-medium uppercase tracking-wide text-white/35">{label}</p>
            <p className="mt-0.5 truncate text-xs font-semibold text-white/85">{value}</p>
        </div>
    );
}
