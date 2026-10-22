import * as THREE from 'three';

import type { ResourceRow } from '../../../resources/types';
import type { TerrainTileset } from '../terrain';
import { isPondType, type WaterSourceVisual } from './water';

/**
 * Construction des entités métier de la scène : parcelles, points d'eau et
 * liens d'irrigation.
 *
 * Chaque objet conserve l'identifiant réel de son enregistrement
 * (`userData.id`) et n'affiche que des propriétés provenant de la base.
 */
export type LatLng = { lat: number; lng: number };

export const STATUS_COLORS: Record<string, number> = {
    disponible: 0x22c55e,
    en_culture: 0x3b82f6,
    en_repos: 0xf59e0b,
    indisponible: 0xef4444,
};

export const STATUS_LEGEND: Array<{ key: string; label: string }> = [
    { key: 'disponible', label: 'Disponible' },
    { key: 'en_culture', label: 'En culture' },
    { key: 'en_repos', label: 'En repos' },
    { key: 'indisponible', label: 'Indisponible' },
];

export const colorToHex = (value: number): string => `#${value.toString(16).padStart(6, '0')}`;

export const num = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export function latLngOf(row: ResourceRow): LatLng | null {
    const lat = Number(row.latitude);
    const lng = Number(row.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

    return { lat, lng };
}

/** Nombre d'enregistrements réellement géolocalisés (bannière d'honnêteté). */
export function locatedCount(...sources: ResourceRow[][]): number {
    return sources.flat().filter((row) => latLngOf(row) !== null).length;
}

function areaM2(row: ResourceRow): number {
    const value = Number(row.area);
    if (!Number.isFinite(value) || value <= 0) return 120;

    switch (String(row.area_unit)) {
        case 'ha':
            return value * 10000;
        case 'are':
        case 'a':
            return value * 100;
        default:
            return value;
    }
}

function outerRing(row: ResourceRow): Array<[number, number]> | null {
    const boundary = row.boundary;
    if (boundary === null || boundary === undefined || typeof boundary !== 'object') return null;

    let coordinates: unknown = boundary;
    if (!Array.isArray(boundary)) {
        coordinates = (boundary as Record<string, unknown>).coordinates;
    }

    if (!Array.isArray(coordinates) || coordinates.length === 0) return null;

    const first = coordinates[0];
    if (!Array.isArray(first)) return null;

    const ring = (Array.isArray(first[0]) ? coordinates[0] : coordinates) as unknown[];
    const points: Array<[number, number]> = [];

    for (const point of ring) {
        if (!Array.isArray(point) || point.length < 2) continue;
        const lng = Number(point[0]);
        const lat = Number(point[1]);
        if (Number.isFinite(lng) && Number.isFinite(lat)) points.push([lng, lat]);
    }

    return points.length >= 3 ? points : null;
}

/**
 * Coordonnées de chaque ligne : réelles quand elles existent, sinon une grille
 * resserrée autour du barycentre — signalée à l'utilisateur comme estimée.
 */
export function resolveEntityLocations(rows: ResourceRow[], waterSources: ResourceRow[]) {
    const located = [...rows, ...waterSources]
        .map(latLngOf)
        .filter((point): point is LatLng => point !== null);

    const center: LatLng = located.length
        ? {
              lat: located.reduce((sum, point) => sum + point.lat, 0) / located.length,
              lng: located.reduce((sum, point) => sum + point.lng, 0) / located.length,
          }
        : { lat: -18.9167, lng: 47.5167 };

    const fill = (source: ResourceRow[]): Map<string, LatLng> => {
        const map = new Map<string, LatLng>();
        const missing = source.filter((row) => latLngOf(row) === null);
        const columns = Math.max(1, Math.ceil(Math.sqrt(missing.length)));
        const lines = Math.max(1, Math.ceil(missing.length / columns));

        // Étendue plausible d'une exploitation (mètres) pour que les parcelles
        // restent lisibles sur un terrain à résolution zodiacale (z15).
        const spanMeters = Math.min(1150, Math.max(420, 150 * Math.sqrt(missing.length)));
        const stepLat = spanMeters / lines / 111320;
        const stepLng = spanMeters / columns / (111320 * Math.cos((center.lat * Math.PI) / 180));

        let index = 0;

        for (const row of source) {
            const provided = latLngOf(row);

            if (provided) {
                map.set(String(row.id), provided);
                continue;
            }

            const column = index % columns;
            const line = Math.floor(index / columns);
            map.set(String(row.id), {
                lat: center.lat - (line - (lines - 1) / 2) * stepLat,
                lng: center.lng + (column - (columns - 1) / 2) * stepLng,
            });
            index += 1;
        }

        return map;
    };

    const plotLocations = fill(rows);
    const waterLocations = fill(waterSources);

    return {
        center,
        plotLocations,
        waterLocations,
        allPoints: [...plotLocations.values(), ...waterLocations.values()],
    };
}

function labelTexture(text: string, accent: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 72;

    const ctx = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);

    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.beginPath();
        ctx.roundRect(4, 8, canvas.width - 8, canvas.height - 16, 16);
        ctx.fill();

        ctx.fillStyle = accent;
        ctx.fillRect(4, 8, 8, canvas.height - 16);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 34px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text.slice(0, 16), canvas.width / 2, canvas.height / 2 + 1);
        texture.needsUpdate = true;
    }

    texture.colorSpace = THREE.SRGBColorSpace;

    return texture;
}

export type EntityLayers = {
    labels: THREE.Group;
    plots: THREE.Group;
    water: THREE.Group;
    links: THREE.Group;
    anchors: Map<string, THREE.Vector3>;
    pickTargets: THREE.Object3D[];
    waterVisuals: WaterSourceVisual[];
    /** Zones à libérer pour la végétation (parcelles et plans d'eau). */
    exclude: Array<{ x: number; z: number; r: number }>;
    labelScale: number;
};

type BuildOptions = {
    rows: ResourceRow[];
    waterSources: ResourceRow[];
    irrigations: ResourceRow[];
    tileset: TerrainTileset;
    heightAt: (x: number, z: number) => number;
    disposers: Array<() => void>;
};

export function buildEntities(options: BuildOptions): EntityLayers {
    const { rows, waterSources, irrigations, tileset, heightAt, disposers } = options;
    const worldSize = tileset.worldSize;
    const locations = resolveEntityLocations(rows, waterSources);

    const labels = new THREE.Group();
    const plots = new THREE.Group();
    const water = new THREE.Group();
    const links = new THREE.Group();

    const labelScale = THREE.MathUtils.clamp(worldSize * 0.02, 8, 70);
    const pickTargets: THREE.Object3D[] = [];
    const anchors = new Map<string, THREE.Vector3>();
    const waterVisuals: WaterSourceVisual[] = [];
    const exclude: Array<{ x: number; z: number; r: number }> = [];

    const addLabel = (text: string, accent: string, x: number, y: number, z: number) => {
        const texture = labelTexture(text, accent);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(labelScale * 3.4, labelScale, 1);
        sprite.position.set(x, y, z);
        sprite.renderOrder = 10;
        labels.add(sprite);

        disposables(disposers, texture, material);

        return sprite;
    };

    // --- Parcelles ---------------------------------------------------
    for (const row of rows) {
        const location = locations.plotLocations.get(String(row.id));
        if (!location) continue;

        const color = STATUS_COLORS[String(row.status)] ?? 0x64748b;
        const center = tileset.project(location.lat, location.lng);
        const ring = outerRing(row);
        const material = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.12,
            roughness: 0.5,
            metalness: 0.05,
            transparent: true,
            opacity: 0.92,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: -3,
            polygonOffsetUnits: -3,
        });
        disposers.push(() => material.dispose());

        let mesh: THREE.Mesh;
        let outline: THREE.LineLoop | null = null;

        if (ring) {
            const contour = ring.map(([lng, lat]) => {
                const point = tileset.project(lat, lng);
                return new THREE.Vector2(point.x, point.z);
            });

            const triangles = THREE.ShapeUtils.triangulateShape(contour, []);
            const vertexArray = new Float32Array(contour.length * 3);

            contour.forEach((point, index) => {
                vertexArray[index * 3] = point.x;
                vertexArray[index * 3 + 1] = heightAt(point.x, point.y) + 0.8;
                vertexArray[index * 3 + 2] = point.y;
            });

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(vertexArray, 3));
            geometry.setIndex(triangles.flat());
            geometry.computeVertexNormals();

            mesh = new THREE.Mesh(geometry, material);
            disposers.push(() => geometry.dispose());

            const outlinePoints = contour.map(
                (point) => new THREE.Vector3(point.x, heightAt(point.x, point.y) + 1.1, point.y),
            );
            const outlineGeometry = new THREE.BufferGeometry().setFromPoints(outlinePoints);
            const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.5 });
            outline = new THREE.LineLoop(outlineGeometry, outlineMaterial);
            disposers.push(() => outlineGeometry.dispose(), () => outlineMaterial.dispose());

            exclude.push({ x: center.x, z: center.z, r: Math.max(...contour.map((p) => p.distanceTo(new THREE.Vector2(center.x, center.z)))) + 6 });
        } else {
            const radius = THREE.MathUtils.clamp(
                Math.sqrt(areaM2(row) / Math.PI),
                worldSize * 0.014,
                worldSize * 0.09,
            );
            const geometry = new THREE.CircleGeometry(radius, 32);
            geometry.rotateX(-Math.PI / 2);
            geometry.translate(0, heightAt(center.x, center.z) + 0.8, 0);

            mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(center.x, 0, center.z);
            disposers.push(() => geometry.dispose());

            exclude.push({ x: center.x, z: center.z, r: radius + 6 });
        }

        mesh.castShadow = true;
        mesh.userData = { kind: 'plot', id: row.id, row, status: String(row.status ?? '') };
        plots.add(mesh);
        if (outline) {
            plots.add(outline);
            mesh.userData.outline = outline;
        }
        pickTargets.push(mesh);
        anchors.set(String(row.id), new THREE.Vector3(center.x, heightAt(center.x, center.z), center.z));

        const label = addLabel(
            String(row.code ?? row.name ?? ''),
            colorToHex(color),
            center.x,
            heightAt(center.x, center.z) + labelScale * 2.4,
            center.z,
        );
        mesh.userData.label = label;
    }

    // --- Ressources en eau ------------------------------------------
    for (const source of waterSources) {
        const location = locations.waterLocations.get(String(source.id));
        if (!location) continue;

        const center = tileset.project(location.lat, location.lng);
        const base = heightAt(center.x, center.z);
        const ratio = THREE.MathUtils.clamp(
            num(source.available_quantity, 0) / Math.max(num(source.capacity, 1), 1),
            0,
            1,
        );
        const critical = num(source.available_quantity, 0) <= num(source.critical_threshold, 0);
        const radius = THREE.MathUtils.clamp(worldSize * 0.012, 3, 22);
        const pond = isPondType(source.type);
        const height = pond ? radius * 0.5 : radius * (0.7 + ratio * 2.4);

        const geometry = pond
            ? new THREE.CylinderGeometry(radius * 2.3, radius * 2.3, height, 40, 1, false)
            : new THREE.CylinderGeometry(radius, radius, height, 40, 1, false);
        geometry.translate(0, height / 2, 0);

        const material = new THREE.MeshStandardMaterial({
            color: critical ? 0xef4444 : pond ? 0x8d7b62 : 0x38bdf8,
            emissive: critical ? 0x7f1d1d : pond ? 0x3f352a : 0x0369a1,
            emissiveIntensity: 0.25,
            transparent: true,
            opacity: 0.78,
            roughness: 0.15,
            metalness: 0.1,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(center.x, base, center.z);
        mesh.castShadow = true;
        mesh.userData = { kind: 'water', id: source.id, row: source };
        water.add(mesh);
        pickTargets.push(mesh);
        anchors.set(String(source.id), new THREE.Vector3(center.x, base, center.z));

        disposers.push(() => geometry.dispose(), () => material.dispose());

        waterVisuals.push({
            id: source.id as string | number,
            x: center.x,
            z: center.z,
            y: base + height,
            radius,
            pond,
        });

        exclude.push({ x: center.x, z: center.z, r: radius * (pond ? 2.6 : 1.6) + 4 });

        const label = addLabel(
            String(source.name ?? ''),
            critical ? '#ef4444' : '#38bdf8',
            center.x,
            base + height + labelScale * 1.4,
            center.z,
        );
        mesh.userData.label = label;
    }

    // --- Liens d'irrigation -----------------------------------------
    const linkMaterial = new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        emissive: 0x0369a1,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.85,
        roughness: 0.3,
    });
    disposers.push(() => linkMaterial.dispose());

    const linkRadius = THREE.MathUtils.clamp(worldSize * 0.0016, 0.25, 1.6);

    for (const irrigation of irrigations) {
        const from = anchors.get(String(irrigation.water_source_id));
        const to = anchors.get(String(irrigation.plot_id));
        if (!from || !to) continue;

        const points: THREE.Vector3[] = [];
        const steps = 24;

        for (let step = 0; step <= steps; step += 1) {
            const t = step / steps;
            const x = from.x + (to.x - from.x) * t;
            const z = from.z + (to.z - from.z) * t;
            // Le tube suit le relief, avec un léger arc au départ/arrivée.
            const arc = Math.sin(t * Math.PI) * linkRadius * 4;
            points.push(new THREE.Vector3(x, heightAt(x, z) + linkRadius * 2 + arc, z));
        }

        const curve = new THREE.CatmullRomCurve3(points);
        const geometry = new THREE.TubeGeometry(curve, steps * 2, linkRadius, 6, false);
        const tube = new THREE.Mesh(geometry, linkMaterial);
        tube.userData = { kind: 'link', id: irrigation.id, row: irrigation };
        links.add(tube);
        disposers.push(() => geometry.dispose());
    }

    return { labels, plots, water, links, anchors, pickTargets, waterVisuals, exclude, labelScale };
}

function disposables(target: Array<() => void>, ...items: Array<{ dispose: () => void }>): void {
    items.forEach((item) => target.push(() => item.dispose()));
}
