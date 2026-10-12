import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize2, Minimize2 } from 'lucide-react';

import type { ResourceRow } from '../../resources/types';
import { humanize } from '../app/status-badge';

export type PlotMapProps = {
    rows: ResourceRow[];
    waterSources: ResourceRow[];
    irrigations?: ResourceRow[];
    onSelect?: (id: string | number | null) => void;
    selectedId?: string | number | null;
};

const STATUS_ORDER = ['disponible', 'en_culture', 'en_repos', 'indisponible'] as const;

const STATUS_COLORS: Record<string, string> = {
    disponible: '#22c55e',
    en_culture: '#3b82f6',
    en_repos: '#f59e0b',
    indisponible: '#ef4444',
};

const DEFAULT_CENTER: [number, number] = [-18.9167, 47.5167];

type LatLng = [number, number];

function latLngOf(row: ResourceRow): LatLng | null {
    const lat = Number(row.latitude);
    const lng = Number(row.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

    return [lat, lng];
}

/** Anneaux GeoJSON `[[lng, lat], …]` de `boundary`, quelle que soit la forme. */
function polygonRings(row: ResourceRow): L.LatLngExpression[][] | null {
    const boundary = row.boundary;

    if (boundary === null || boundary === undefined || typeof boundary !== 'object') return null;

    let coordinates: unknown = boundary;

    if (!Array.isArray(boundary)) {
        coordinates = (boundary as Record<string, unknown>).coordinates;
    }

    if (!Array.isArray(coordinates) || coordinates.length === 0) return null;

    const first = coordinates[0];

    if (!Array.isArray(first)) return null;

    // Anneau unique `[ [lng,lat], … ]` ou liste d'anneaux `[ [ [lng,lat], …] ]`.
    const rings: unknown[] = Array.isArray(first[0]) ? coordinates : [coordinates];

    const parsed = rings
        .map((ring) =>
            (ring as unknown[])
                .map((point) => {
                    if (!Array.isArray(point) || point.length < 2) return null;
                    return [Number(point[1]), Number(point[0])] as LatLng;
                })
                .filter((point): point is LatLng => point !== null && Number.isFinite(point[0]) && Number.isFinite(point[1])),
        )
        .filter((ring) => ring.length >= 3);

    return parsed.length > 0 ? parsed : null;
}

/**
 * Positions de rendu : coordonnées réelles quand elles existent, sinon repli
 * sur une grille approximative autour du barycentre des parcelles géolocalisées
 * (ou du centre par défaut) pour que tout apparaisse sur la carte.
 */
function resolvePositions(resources: ResourceRow[], fallbackCenter: LatLng): Map<string, LatLng> {
    const located = resources.map(latLngOf).filter((point): point is LatLng => point !== null);

    const center: LatLng = located.length
        ? [
              located.reduce((sum, point) => sum + point[0], 0) / located.length,
              located.reduce((sum, point) => sum + point[1], 0) / located.length,
          ]
        : fallbackCenter;

    const positions = new Map<string, LatLng>();
    let missing = 0;

    for (const row of resources) {
        const key = String(row.id);
        const provided = latLngOf(row);

        if (provided) {
            positions.set(key, provided);
            continue;
        }

        const column = (missing % 5) - 2;
        const line = Math.floor(missing / 5) - 1;
        positions.set(key, [center[0] + line * 0.0016, center[1] + column * 0.0016]);
        missing += 1;
    }

    return positions;
}

export function PlotsMap({ rows, waterSources, irrigations = [], onSelect, selectedId }: PlotMapProps) {
    const host = useRef<HTMLDivElement>(null);
    const wrapper = useRef<HTMLDivElement>(null);
    const map = useRef<L.Map | null>(null);
    const plotsLayer = useRef<L.LayerGroup | null>(null);
    const waterLayer = useRef<L.LayerGroup | null>(null);
    const linksLayer = useRef<L.LayerGroup | null>(null);
    const [fullscreen, setFullscreen] = useState(false);
    const [showWater, setShowWater] = useState(true);
    const [showLinks, setShowLinks] = useState(true);
    const [statuses, setStatuses] = useState<Record<string, boolean>>({
        disponible: true,
        en_culture: true,
        en_repos: true,
        indisponible: true,
    });

    const visiblePlots = useMemo(
        () => rows.filter((row) => statuses[String(row.status)] !== false),
        [rows, statuses],
    );

    const farmCenter = useMemo<LatLng>(() => {
        const located = rows.map(latLngOf).filter((point): point is LatLng => point !== null);

        if (located.length === 0) return DEFAULT_CENTER;

        return [
            located.reduce((sum, point) => sum + point[0], 0) / located.length,
            located.reduce((sum, point) => sum + point[1], 0) / located.length,
        ];
    }, [rows]);

    const plotPositions = useMemo(() => resolvePositions(rows, farmCenter), [rows, farmCenter]);
    const sourcePositions = useMemo(
        () => resolvePositions(waterSources, farmCenter),
        [waterSources, farmCenter],
    );

    useEffect(() => {
        if (!host.current || map.current) return;

        const instance = L.map(host.current, { scrollWheelZoom: true }).setView(DEFAULT_CENTER, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap',
            maxZoom: 19,
        }).addTo(instance);

        plotsLayer.current = L.layerGroup().addTo(instance);
        linksLayer.current = L.layerGroup().addTo(instance);
        waterLayer.current = L.layerGroup().addTo(instance);
        map.current = instance;

        return () => {
            instance.remove();
            map.current = null;
        };
    }, []);

    // Parcelles : polygone si `boundary`, sinon marqueur.
    useEffect(() => {
        const layer = plotsLayer.current;
        if (!layer) return;
        layer.clearLayers();

        const bounds = L.latLngBounds([]);

        for (const row of visiblePlots) {
            const color = STATUS_COLORS[String(row.status)] ?? '#64748b';
            const rings = polygonRings(row);
            const center = plotPositions.get(String(row.id)) ?? null;
            const selected = selectedId !== undefined && selectedId !== null && String(row.id) === String(selectedId);
            const popup = `
                <div style="min-width:160px">
                    <div style="font-weight:600">${row.code ?? ''} · ${row.name ?? ''}</div>
                    <div>Surface : ${row.area ?? ''} ${row.area_unit ?? ''}</div>
                    <div>Statut : ${humanize(String(row.status ?? ''))}</div>
                    <div>Priorité : ${humanize(String(row.manual_priority ?? ''))}</div>
                </div>`;

            if (rings) {
                const polygon = L.polygon(rings, {
                    color,
                    weight: selected ? 4 : 2,
                    fillColor: color,
                    fillOpacity: 0.35,
                });
                polygon.bindPopup(popup);
                polygon.on('click', () => onSelect?.(row.id as string | number));
                polygon.addTo(layer);
                bounds.extend(polygon.getBounds());
            } else if (center) {
                const marker = L.circleMarker(center, {
                    radius: selected ? 11 : 8,
                    color,
                    weight: selected ? 4 : 2,
                    fillColor: color,
                    fillOpacity: 0.75,
                });
                marker.bindPopup(popup);
                marker.on('click', () => onSelect?.(row.id as string | number));
                marker.addTo(layer);
                bounds.extend(center);
            }
        }

        if (bounds.isValid() && map.current) {
            map.current.fitBounds(bounds.pad(0.15));
        }
    }, [visiblePlots, onSelect, selectedId, plotPositions]);

    // Ressources en eau.
    useEffect(() => {
        const layer = waterLayer.current;
        if (!layer) return;
        layer.clearLayers();
        if (!showWater) return;

        for (const source of waterSources) {
            const center = sourcePositions.get(String(source.id));
            if (!center) continue;

            const ratio = Math.min(Number(source.available_quantity) / Math.max(Number(source.capacity) || 1, 1), 1);
            const critical = Number(source.available_quantity) <= Number(source.critical_threshold);

            L.circle(center, {
                radius: ratio * 120 + 40,
                color: critical ? '#dc2626' : '#2563eb',
                fillColor: critical ? '#f87171' : '#60a5fa',
                fillOpacity: 0.35,
                weight: 1,
            })
                .bindPopup(
                    `<div style="min-width:150px"><div style="font-weight:600">${source.name ?? ''}</div>
                    <div>Type : ${humanize(String(source.type ?? ''))}</div>
                    <div>${source.available_quantity ?? 0} / ${source.capacity ?? 0} ${source.unit ?? ''}</div></div>`,
                )
                .addTo(layer);
        }
    }, [waterSources, showWater, sourcePositions]);

    // Liens irrigation : parcelle desservie ← ressource en eau.
    useEffect(() => {
        const layer = linksLayer.current;
        if (!layer) return;
        layer.clearLayers();
        if (!showLinks) return;

        for (const irrigation of irrigations) {
            const from = sourcePositions.get(String(irrigation.water_source_id));
            const to = plotPositions.get(String(irrigation.plot_id));
            if (!from || !to) continue;

            L.polyline([from, to], {
                color: '#0ea5e9',
                weight: 1.5,
                opacity: 0.6,
                dashArray: '5 5',
            }).addTo(layer);
        }
    }, [irrigations, waterSources, rows, showLinks, plotPositions, sourcePositions]);

    const toggleFullscreen = async () => {
        if (!wrapper.current) return;

        if (document.fullscreenElement) {
            await document.exitFullscreen();
            setFullscreen(false);
        } else {
            await wrapper.current.requestFullscreen();
            setFullscreen(true);
        }
    };

    return (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div ref={wrapper} className="relative">
                <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={() => void toggleFullscreen()}
                        className="rounded-lg border border-ink-200 bg-white/90 p-2 text-ink-700 shadow-soft hover:bg-white"
                        aria-label={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
                    >
                        {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                    </button>
                </div>

                <div
                    ref={host}
                    className={fullscreen ? 'h-screen w-full' : 'h-[560px] w-full overflow-hidden rounded-2xl border border-ink-100'}
                />

                <div className="absolute bottom-3 left-3 z-[400] rounded-xl border border-ink-100 bg-white/95 px-3 py-2 text-xs shadow-soft">
                    <p className="mb-1 font-semibold text-ink-800">Légende</p>
                    <ul className="space-y-0.5">
                        {STATUS_ORDER.map((status) => (
                            <li key={status} className="flex items-center gap-2 text-ink-600">
                                <span
                                    className="inline-block size-3 rounded-full"
                                    style={{ backgroundColor: STATUS_COLORS[status] }}
                                />
                                {humanize(status)}
                            </li>
                        ))}
                        <li className="flex items-center gap-2 text-ink-600">
                            <span className="inline-block size-3 rounded-full bg-water-600" />
                            Point d’eau
                        </li>
                    </ul>
                </div>
            </div>

            <aside className="rounded-2xl border border-ink-100 bg-white p-3 shadow-soft">
                <div className="mb-2 space-y-1.5">
                    <p className="text-sm font-semibold text-ink-800">Filtres</p>
                    {STATUS_ORDER.map((status) => (
                        <label key={status} className="flex items-center gap-2 text-sm text-ink-700">
                            <input
                                type="checkbox"
                                checked={statuses[status] !== false}
                                onChange={(event) =>
                                    setStatuses((current) => ({ ...current, [status]: event.target.checked }))
                                }
                            />
                            {humanize(status)}
                        </label>
                    ))}
                    <label className="flex items-center gap-2 text-sm text-ink-700">
                        <input type="checkbox" checked={showWater} onChange={(event) => setShowWater(event.target.checked)} />
                        Ressources en eau
                    </label>
                    <label className="flex items-center gap-2 text-sm text-ink-700">
                        <input type="checkbox" checked={showLinks} onChange={(event) => setShowLinks(event.target.checked)} />
                        Liens d’irrigation
                    </label>
                </div>

                <p className="mb-1 text-sm font-semibold text-ink-800">
                    Parcelles ({visiblePlots.length})
                </p>
                <ul className="max-h-80 space-y-1 overflow-y-auto">
                    {visiblePlots.map((row) => (
                        <li key={String(row.id)}>
                            <button
                                type="button"
                                onClick={() => onSelect?.(row.id as string | number)}
                                className={`w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-ink-50 ${
                                    String(selectedId) === String(row.id) ? 'bg-brand-50 text-brand-800' : 'text-ink-700'
                                }`}
                            >
                                <span className="font-medium">{String(row.code ?? '')}</span> · {String(row.name ?? '')}
                            </button>
                        </li>
                    ))}
                </ul>
            </aside>
        </div>
    );
}
