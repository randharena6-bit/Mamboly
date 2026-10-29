import {
    ChevronRight,
    CircleDot,
    Compass,
    Crosshair,
    Droplets,
    Footprints,
    HelpCircle,
    Keyboard,
    Map as MapIcon,
    Maximize2,
    Minimize2,
    Moon,
    MousePointer2,
    Pause,
    Play,
    RotateCcw,
    Sprout,
    Sun,
    Tractor,
    Waves,
    Wheat,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { ResourceRow } from '../../resources/types';
import { humanize } from '../app/status-badge';
import { cropPalette, STATUS } from './farm3d/core';
import type { FarmMinimap, FarmSelection, ViewMode } from './farm3d/core';
import { FarmWorld } from './farm3d/world';

export type Plots3DProps = {
    rows: ResourceRow[];
    waterSources: ResourceRow[];
    irrigations?: ResourceRow[];
    campaigns?: ResourceRow[];
    crops?: ResourceRow[];
    heading?: string;
    subheading?: string;
    showCropFilter?: boolean;
};

const MODES: Array<{
    id: ViewMode;
    label: string;
    icon: typeof MapIcon;
    description: string;
    controls: string;
}> = [
    {
        id: 'orbit',
        label: 'Vue ferme',
        icon: MapIcon,
        description: 'Survol de l’exploitation',
        controls: 'Glisser pour tourner · Molette pour zoomer',
    },
    {
        id: 'walk',
        label: 'Explorer',
        icon: Footprints,
        description: 'Marcher dans la ferme',
        controls: 'ZQSD / WASD · Maj pour courir · Glisser pour la caméra',
    },
    {
        id: 'drive',
        label: 'Tracteur',
        icon: Tractor,
        description: 'Conduire le tracteur',
        controls: 'W/S accélérer et reculer · A/D diriger · Espace freiner',
    },
];

const STATUS_ITEMS = Object.entries(STATUS);

function formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
}

function formatArea(row: ResourceRow): string {
    const area = formatValue(row.area);
    const unit = String(row.area_unit ?? '').replace('m2', 'm²');
    return `${area} ${unit}`.trim();
}

function formatHour(hour: number): string {
    const hours = Math.floor(hour) % 24;
    const minutes = Math.floor((hour - Math.floor(hour)) * 60);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function StatusDot({ color }: { color: string }) {
    return <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}

export function Plots3D({
    rows,
    waterSources,
    irrigations = [],
    campaigns = [],
    crops = [],
    heading = 'Ferme AgriWater',
    subheading = 'Vallée des parcelles',
    showCropFilter = false,
}: Plots3DProps) {
    const wrapper = useRef<HTMLDivElement>(null);
    const canvas = useRef<HTMLCanvasElement>(null);
    const world = useRef<FarmWorld | null>(null);
    const modeRef = useRef<ViewMode>('orbit');
    const autoTimeRef = useRef(true);
    const cropFilterRef = useRef<string | null>(null);

    const dataRef = useRef({ rows, waterSources, irrigations, campaigns });
    dataRef.current = { rows, waterSources, irrigations, campaigns };
    const dataKey = useMemo(
        () => JSON.stringify([rows, waterSources, irrigations, campaigns]),
        [rows, waterSources, irrigations, campaigns],
    );

    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<ViewMode>('orbit');
    const [hour, setHour] = useState(15.5);
    const [autoTime, setAutoTime] = useState(true);
    const [selected, setSelected] = useState<FarmSelection>(null);
    const [minimap, setMinimap] = useState<FarmMinimap | null>(null);
    const [fullscreen, setFullscreen] = useState(false);
    const [help, setHelp] = useState(false);
    const [cropFilter, setCropFilter] = useState<string | null>(null);

    autoTimeRef.current = autoTime;
    cropFilterRef.current = cropFilter;

    useEffect(() => {
        const element = canvas.current;
        if (!element) return;

        setReady(false);
        setError(null);
        setSelected(null);

        let instance: FarmWorld;

        try {
            instance = new FarmWorld({
                canvas: element,
                rows: dataRef.current.rows,
                waterSources: dataRef.current.waterSources,
                irrigations: dataRef.current.irrigations,
                campaigns: dataRef.current.campaigns,
                onSelect: (next) => setSelected(next),
                onTime: (next) => setHour(next),
                onMinimap: (next) => setMinimap(next),
                onReady: () => setReady(true),
            });
        } catch {
            setError('Impossible de démarrer la scène 3D. Vérifiez que WebGL est activé dans votre navigateur.');
            return;
        }

        world.current = instance;
        instance.setMode(modeRef.current);
        instance.setAutoTime(autoTimeRef.current);
        instance.setCropFilter(cropFilterRef.current);

        return () => {
            instance.dispose();
            world.current = null;
        };
    }, [dataKey]);

    useEffect(() => {
        if (cropFilter === null) {
            world.current?.setCropFilter(null);
            return;
        }

        world.current?.focusCrop(cropFilter);
    }, [cropFilter]);

    useEffect(() => {
        const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
        document.addEventListener('fullscreenchange', onChange);

        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);

    const activeMode = MODES.find((entry) => entry.id === mode) ?? MODES[0];
    const located = rows.filter((row) => Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude))).length;
    const cropIdsWithCampaign = useMemo(() => {
        const ids = new Set<string>();

        for (const campaign of campaigns) {
            const crop = campaign.crop;
            const id =
                crop !== null && typeof crop === 'object'
                    ? (crop as ResourceRow).id
                    : campaign.crop_id;

            if (id !== null && id !== undefined) ids.add(String(id));
        }

        return ids;
    }, [campaigns]);
    const availableCrops = useMemo(
        () => crops.filter((crop) => cropIdsWithCampaign.has(String(crop.id))),
        [crops, cropIdsWithCampaign],
    );
    const cropPlotCounts = useMemo(() => {
        const counts = new Map<string, number>();

        for (const campaign of campaigns) {
            const crop = campaign.crop;
            const id =
                crop !== null && typeof crop === 'object'
                    ? (crop as ResourceRow).id
                    : campaign.crop_id;

            if (id === null || id === undefined) continue;
            counts.set(String(id), (counts.get(String(id)) ?? 0) + 1);
        }

        return counts;
    }, [campaigns]);
    const changeMode = (next: ViewMode) => {
        modeRef.current = next;
        setMode(next);
        world.current?.setMode(next);
    };

    const toggleTime = () => {
        const next = !autoTime;
        autoTimeRef.current = next;
        setAutoTime(next);
        world.current?.setAutoTime(next);
    };

    const reset = () => {
        modeRef.current = 'orbit';
        setMode('orbit');
        world.current?.resetView();
    };

    const focus = () => {
        if (!selected) return;
        modeRef.current = 'orbit';
        setMode('orbit');
        world.current?.focusSelection(selected.kind, String(selected.row.id));
    };

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

    const closeSelection = () => {
        setSelected(null);
        world.current?.clearSelection();
    };

    return (
        <div
            ref={wrapper}
            className={`relative overflow-hidden bg-[#0b1220] shadow-[0_30px_80px_-30px_rgba(15,23,42,0.75)] ${
                fullscreen
                    ? 'h-screen min-h-0 rounded-none border-0'
                    : 'h-[calc(100dvh-11rem)] min-h-[600px] rounded-3xl border border-slate-700/60'
            }`}
        >
            <canvas ref={canvas} className="absolute inset-0 h-full w-full touch-none outline-none" />

            {!ready && !error && (
                <div className="absolute inset-0 z-30 grid place-items-center bg-[#0b1220]">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <span className="grid size-14 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10">
                            <Wheat className="size-7 animate-pulse text-emerald-300" />
                        </span>
                        <div>
                            <p className="font-display text-lg font-semibold text-white">Préparation de la ferme</p>
                            <p className="mt-1 text-sm text-slate-400">Terrain, cultures, bâtiments et tracteur…</p>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 z-30 grid place-items-center bg-[#0b1220] p-6">
                    <div className="max-w-md rounded-2xl border border-rose-400/30 bg-rose-500/10 p-6 text-center">
                        <p className="font-display text-lg font-semibold text-white">Scène 3D indisponible</p>
                        <p className="mt-2 text-sm text-rose-100/80">{error}</p>
                    </div>
                </div>
            )}

            {/* Barre supérieure */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4">
                <div className="pointer-events-auto hidden min-w-0 items-center gap-3 rounded-2xl border border-white/15 bg-slate-950/70 px-3 py-2.5 shadow-xl backdrop-blur-xl sm:flex">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-emerald-400/30 bg-emerald-500/15">
                        <Wheat className="size-5 text-emerald-300" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">{heading}</p>
                        <p className="truncate font-display text-sm font-semibold text-white">{subheading}</p>
                    </div>
                    <span className="hidden shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/70 sm:inline">
                        {rows.length} parcelle{rows.length > 1 ? 's' : ''}
                    </span>
                </div>

                <div className="pointer-events-auto flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-2xl border border-white/15 bg-slate-950/70 p-1 shadow-xl backdrop-blur-xl">
                        <span className="grid size-9 place-items-center text-amber-300">
                            {hour >= 6 && hour < 19 ? <Sun className="size-4" /> : <Moon className="size-4" />}
                        </span>
                        <div className="min-w-[3.4rem] px-1 text-center">
                            <p className="font-mono text-sm font-semibold tabular-nums text-white">{formatHour(hour)}</p>
                            <p className="text-[9px] uppercase tracking-wider text-white/40">Journée</p>
                        </div>
                        <button
                            type="button"
                            onClick={toggleTime}
                            className="grid size-9 place-items-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
                            aria-label={autoTime ? 'Mettre le temps en pause' : 'Relancer le cycle jour/nuit'}
                            title={autoTime ? 'Mettre le temps en pause' : 'Relancer le cycle jour/nuit'}
                        >
                            {autoTime ? <Pause className="size-4" /> : <Play className="size-4" />}
                        </button>
                    </div>

                    <div className="flex items-center gap-1 rounded-2xl border border-white/15 bg-slate-950/70 p-1 shadow-xl backdrop-blur-xl">
                        <button
                            type="button"
                            onClick={reset}
                            className="grid size-9 place-items-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
                            aria-label="Recentrer la caméra"
                            title="Recentrer"
                        >
                            <RotateCcw className="size-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setHelp(true)}
                            className="grid size-9 place-items-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
                            aria-label="Afficher les commandes"
                            title="Commandes"
                        >
                            <HelpCircle className="size-4" />
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
            </div>

            {/* Filtre par culture */}
            {showCropFilter && availableCrops.length > 0 && (
                <>
                    <div className="pointer-events-auto absolute top-3 left-3 z-20 md:hidden">
                        <label className="sr-only" htmlFor="crop-filter-mobile">Filtrer par culture</label>
                        <select
                            id="crop-filter-mobile"
                            value={cropFilter ?? ''}
                            onChange={(event) => setCropFilter(event.target.value === '' ? null : event.target.value)}
                            className="rounded-xl border border-white/15 bg-slate-950/80 px-3 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur-xl"
                        >
                            <option value="">Toutes les cultures</option>
                            {availableCrops.map((crop) => (
                                <option key={String(crop.id)} value={String(crop.id)}>
                                    {String(crop.name ?? 'Culture')}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="pointer-events-none absolute top-20 left-3 z-20 hidden w-[16rem] max-w-[calc(100%-1.5rem)] md:block">
                        <div className="pointer-events-auto overflow-hidden rounded-2xl border border-white/15 bg-slate-950/72 text-white shadow-2xl backdrop-blur-xl">
                            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3.5 py-3">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Filtrer par culture</p>
                                    <p className="mt-0.5 font-display text-sm font-semibold">{availableCrops.length} culture{availableCrops.length > 1 ? 's' : ''} au champ</p>
                                </div>
                                <Sprout className="size-4 text-emerald-300" />
                            </div>
                            <div className="max-h-64 space-y-1 overflow-y-auto p-2">
                                <button
                                    type="button"
                                    onClick={() => setCropFilter(null)}
                                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition ${
                                        cropFilter === null ? 'bg-emerald-500 text-emerald-950' : 'text-white/70 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    <span className="flex items-center gap-2 font-semibold">
                                        <span className="inline-block size-2.5 rounded-full bg-white/70" />
                                        Toutes les cultures
                                    </span>
                                    <span className="tabular-nums opacity-70">{campaigns.length}</span>
                                </button>
                                {availableCrops.map((crop) => {
                                    const palette = cropPalette(crop);
                                    const active = cropFilter === String(crop.id);

                                    return (
                                        <button
                                            key={String(crop.id)}
                                            type="button"
                                            onClick={() => setCropFilter(active ? null : String(crop.id))}
                                            className={`flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-xs transition ${
                                                active ? 'bg-white text-slate-900 shadow-lg' : 'text-white/70 hover:bg-white/10 hover:text-white'
                                            }`}
                                        >
                                            <span className="flex min-w-0 items-center gap-2">
                                                <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: palette.css }} />
                                                <span className="truncate font-semibold">{String(crop.name ?? 'Culture')}</span>
                                            </span>
                                            <span className="shrink-0 tabular-nums opacity-70">{cropPlotCounts.get(String(crop.id)) ?? 0}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Sélection / tableau de bord */}
            <div className="pointer-events-none absolute top-20 right-3 z-20 w-[21rem] max-w-[calc(100%-1.5rem)] sm:top-24">
                <div className="pointer-events-auto overflow-hidden rounded-2xl border border-white/15 bg-slate-950/72 text-white shadow-2xl backdrop-blur-xl">
                    {selected ? (
                        <SelectionPanel selection={selected} onClose={closeSelection} onFocus={focus} />
                    ) : (
                        <div className="p-4">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Exploitation</p>
                                    <p className="font-display text-base font-semibold">Carte de la ferme</p>
                                </div>
                                <span className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-emerald-300">
                                    <Compass className="size-4" />
                                </span>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2">
                                <Metric icon={Sprout} label="Parcelles" value={String(rows.length)} />
                                {campaigns.length > 0 ? (
                                    <>
                                        <Metric icon={Wheat} label="Cultures" value={String(availableCrops.length)} />
                                        <Metric icon={Compass} label="Campagnes" value={String(campaigns.length)} />
                                        <Metric icon={Crosshair} label="Géolocalisées" value={`${located}/${rows.length}`} />
                                    </>
                                ) : (
                                    <>
                                        <Metric icon={Droplets} label="Points d’eau" value={String(waterSources.length)} />
                                        <Metric icon={Waves} label="Irrigations" value={String(irrigations.length)} />
                                        <Metric icon={Crosshair} label="Géolocalisées" value={`${located}/${rows.length}`} />
                                    </>
                                )}
                            </div>

                            <div className="mt-4 border-t border-white/10 pt-3">
                                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Statut des parcelles</p>
                                <ul className="grid grid-cols-2 gap-1.5">
                                    {STATUS_ITEMS.map(([key, meta]) => (
                                        <li key={key} className="flex items-center gap-2 text-xs text-white/70">
                                            <StatusDot color={meta.css} />
                                            {meta.label}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-100/80">
                                <MousePointer2 className="mt-0.5 size-4 shrink-0" />
                                <p>Cliquez sur un champ ou un réservoir pour explorer les données de l’exploitation.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modes */}
            <div className="pointer-events-auto absolute bottom-3 left-3 z-20 flex gap-1 rounded-2xl border border-white/15 bg-slate-950/72 p-1.5 shadow-2xl backdrop-blur-xl">
                {MODES.map((entry) => {
                    const Icon = entry.icon;
                    const active = entry.id === mode;

                    return (
                        <button
                            key={entry.id}
                            type="button"
                            onClick={() => changeMode(entry.id)}
                            className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-left transition sm:px-3 ${
                                active ? 'bg-emerald-500 text-emerald-950 shadow-lg' : 'text-white/65 hover:bg-white/10 hover:text-white'
                            }`}
                            title={entry.description}
                        >
                            <Icon className="size-4 shrink-0" />
                            <span className="hidden text-xs font-semibold sm:block">{entry.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Aide contextuelle */}
            <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 md:block">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/55 px-3 py-1.5 text-[11px] text-white/60 backdrop-blur">
                    <Keyboard className="size-3.5" />
                    {activeMode.controls}
                </div>
            </div>

            {/* Mini-carte */}
            {minimap && <Minimap data={minimap} mode={mode} />}

            {/* Commandes */}
            {help && (
                <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-slate-900 text-white shadow-2xl">
                        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/80">Aide</p>
                                <h2 className="mt-1 font-display text-xl font-semibold">Commandes de la ferme</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setHelp(false)}
                                className="grid size-9 place-items-center rounded-xl bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
                                aria-label="Fermer l’aide"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <div className="space-y-2 p-5">
                            {MODES.map((entry) => {
                                const Icon = entry.icon;

                                return (
                                    <div key={entry.id} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300">
                                            <Icon className="size-4" />
                                        </span>
                                        <div>
                                            <p className="text-sm font-semibold">{entry.label}</p>
                                            <p className="mt-0.5 text-xs text-white/55">{entry.description}</p>
                                            <p className="mt-1 font-mono text-[11px] text-emerald-200/80">{entry.controls}</p>
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/60">
                                <p className="font-semibold text-white/80">Astuces</p>
                                <ul className="mt-1.5 space-y-1">
                                    <li className="flex items-center gap-2"><CircleDot className="size-3 text-emerald-300" /> Cliquez sur une parcelle pour afficher ses données réelles.</li>
                                    <li className="flex items-center gap-2"><CircleDot className="size-3 text-sky-300" /> Les réservoirs bleus représentent les points d’eau enregistrés.</li>
                                    <li className="flex items-center gap-2"><CircleDot className="size-3 text-amber-300" /> Le cycle jour/nuit peut être mis en pause dans la barre du haut.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Metric({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Sprout;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-white/45">
                <Icon className="size-3.5" />
                <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
            </div>
            <p className="mt-1 font-display text-lg font-semibold tabular-nums text-white">{value}</p>
        </div>
    );
}

function SelectionPanel({
    selection,
    onClose,
    onFocus,
}: {
    selection: NonNullable<FarmSelection>;
    onClose: () => void;
    onFocus: () => void;
}) {
    if (selection.kind === 'water') {
        const row = selection.row;
        const available = Number(row.available_quantity ?? 0);
        const capacity = Number(row.capacity ?? 0);
        const ratio = capacity > 0 ? clampPercent((available / capacity) * 100) : 0;

        return (
            <div>
                <div className="border-b border-white/10 bg-sky-500/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300/80">Point d’eau</p>
                            <p className="mt-1 truncate font-display text-base font-semibold">{String(row.name ?? 'Réservoir')}</p>
                            <p className="mt-0.5 text-xs text-white/50">#{String(row.id)} · {humanize(String(row.type ?? '—'))}</p>
                        </div>
                        <button type="button" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Fermer">
                            <X className="size-4" />
                        </button>
                    </div>
                </div>

                <div className="space-y-3 p-4">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="flex items-end justify-between gap-2">
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-white/40">Disponible</p>
                                <p className="font-display text-2xl font-semibold tabular-nums">{available}</p>
                            </div>
                            <p className="text-xs text-white/50">/ {capacity} {String(row.unit ?? '')}</p>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-sky-400" style={{ width: `${ratio}%` }} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <Detail label="Statut" value={humanize(String(row.status ?? '—'))} />
                        <Detail label="Seuil critique" value={`${formatValue(row.critical_threshold)} ${String(row.unit ?? '')}`.trim()} />
                    </div>

                    <button type="button" onClick={onFocus} className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-3 py-2 text-xs font-semibold text-sky-950 transition hover:bg-sky-400">
                        <Crosshair className="size-4" />
                        Centrer sur le réservoir
                    </button>
                </div>
            </div>
        );
    }

    const row = selection.row;
    const status = STATUS[String(row.status)] ?? STATUS.disponible;
    const crop = selection.crop;
    const campaign = selection.campaign;
    const palette = crop ? cropPalette(crop) : null;
    const moisture = Number(row.soil_moisture);
    const moistureRatio = Number.isFinite(moisture) ? clampPercent(moisture) : 0;
    const moistureColor = moistureRatio < 35 ? 'bg-amber-400' : moistureRatio < 65 ? 'bg-sky-400' : 'bg-emerald-400';

    return (
        <div>
            <div className="border-b border-white/10 p-4" style={{ background: `linear-gradient(135deg, ${status.css}22, transparent 70%)` }}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: status.css }}>
                            <StatusDot color={status.css} />
                            {status.label}
                        </div>
                        <p className="mt-1 truncate font-display text-base font-semibold">{String(row.name ?? 'Parcelle')}</p>
                        <p className="mt-0.5 text-xs text-white/50">
                            {String(row.code ?? '—')} · #{String(row.id)}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Fermer">
                        <X className="size-4" />
                    </button>
                </div>
            </div>

            <div className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-2">
                    <Detail label="Surface" value={formatArea(row)} />
                    <Detail label="Priorité" value={humanize(String(row.manual_priority ?? '—'))} />
                    <Detail label="Sol" value={String(row.soil_type ?? '—')} />
                    <Detail label="Localisation" value={String(row.location ?? '—')} />
                </div>

                {crop && palette && (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="flex items-center justify-between gap-2">
                            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/45">
                                <Wheat className="size-3.5" style={{ color: palette.css }} />
                                Culture au champ
                            </p>
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: `${palette.css}22`, color: palette.css }}>
                                {humanize(String(crop.category ?? '—'))}
                            </span>
                        </div>
                        <p className="mt-2 font-display text-base font-semibold" style={{ color: palette.css }}>
                            {String(crop.name ?? 'Culture')}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <Detail label="Durée" value={`${String(crop.estimated_duration_days ?? '—')} j`} />
                            <Detail label="Besoin eau" value={`${String(crop.water_requirement ?? '—')} L/m²`} />
                            <Detail label="Campagne" value={String(campaign?.code ?? campaign?.name ?? '—')} />
                            <Detail label="Statut" value={humanize(String(campaign?.status ?? '—'))} />
                        </div>
                    </div>
                )}

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-white/45">
                            <Droplets className="size-3.5" />
                            Humidité du sol
                        </p>
                        <p className="font-display text-sm font-semibold tabular-nums">
                            {Number.isFinite(moisture) ? `${moisture.toFixed(1)} %` : '—'}
                        </p>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className={`h-full rounded-full ${moistureColor}`} style={{ width: `${moistureRatio}%` }} />
                    </div>
                </div>

                <button type="button" onClick={onFocus} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-400">
                    <Crosshair className="size-4" />
                    Centrer sur la parcelle
                    <ChevronRight className="size-3.5" />
                </button>
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

function clampPercent(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
}

function Minimap({ data, mode }: { data: FarmMinimap; mode: ViewMode }) {
    const active = mode === 'drive' ? data.tractor : data.player;
    const markerColor = mode === 'drive' ? '#f87171' : '#34d399';

    return (
        <div className="pointer-events-none absolute right-3 bottom-3 z-10 hidden overflow-hidden rounded-2xl border border-white/15 bg-slate-950/72 p-2 shadow-2xl backdrop-blur-xl md:block">
            <div className="relative">
                <svg viewBox="-180 -180 360 360" className="size-40 rounded-xl bg-[#2f4a2c]">
                    <defs>
                        <pattern id="farm-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.7" />
                        </pattern>
                    </defs>
                    <rect x="-180" y="-180" width="360" height="360" fill="url(#farm-grid)" />
                    <circle cx={70} cy={49} r={18} fill="#2c7fa8" stroke="#7dd3fc" strokeWidth="1.5" />
                    {data.plots.map((plot) => (
                        <rect
                            key={plot.id}
                            x={plot.x - plot.width / 2}
                            y={plot.z - plot.depth / 2}
                            width={plot.width}
                            height={plot.depth}
                            rx={3}
                            fill={plot.color}
                            fillOpacity={0.8}
                            stroke="rgba(255,255,255,0.35)"
                            strokeWidth="1"
                        />
                    ))}
                    {data.water.map((source, index) => (
                        <circle key={index} cx={source.x} cy={source.z} r={4} fill="#38bdf8" stroke="#e0f2fe" strokeWidth="1" />
                    ))}
                    <circle cx={active.x} cy={active.z} r={12} fill={markerColor} fillOpacity={0.18} />
                    <circle cx={active.x} cy={active.z} r={5.5} fill={markerColor} stroke="#ffffff" strokeWidth="1.5" />
                    <text x="-168" y="-162" fill="rgba(255,255,255,0.7)" fontSize="11" fontWeight="700">N</text>
                </svg>
                <span className="absolute top-1.5 right-1.5 rounded-full border border-white/10 bg-slate-950/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/60">
                    {mode === 'drive' ? 'Tracteur' : mode === 'walk' ? 'Vous' : 'Ferme'}
                </span>
            </div>
        </div>
    );
}
