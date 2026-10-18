import { Box, CloudRain, Crosshair, Droplets, Eye, EyeOff, Focus, Gamepad2, Maximize2, Minimize2, Mountain, Plane, Sun } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

import type { ResourceRow } from '../../resources/types';
import { humanize } from '../app/status-badge';
import { loadTerrainTileset, proceduralGroundTexture, terrainDefaults, type LatLng } from './terrain';

export type Plots3DProps = {
    rows: ResourceRow[];
    waterSources: ResourceRow[];
    irrigations?: ResourceRow[];
};

type NavMode = 'orbit' | 'fly' | 'walk';
type Status = 'loading' | 'ready' | 'procedural' | 'error';

const DEFAULT_CENTER: LatLng = terrainDefaults.defaultCenter;

const STATUS_COLORS: Record<string, number> = {
    disponible: 0x22c55e,
    en_culture: 0x3b82f6,
    en_repos: 0xf59e0b,
    indisponible: 0xef4444,
};

const STATUS_LEGEND: Array<{ key: string; label: string }> = [
    { key: 'disponible', label: 'Disponible' },
    { key: 'en_culture', label: 'En culture' },
    { key: 'en_repos', label: 'En repos' },
    { key: 'indisponible', label: 'Indisponible' },
];

const VERTICAL_EXAGGERATION = 1.6;
const RESOLUTION = 160;

const num = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

function latLngOf(row: ResourceRow): LatLng | null {
    const lat = Number(row.latitude);
    const lng = Number(row.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

    return { lat, lng };
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
 * resserrée autour du barycentre pour que tout apparaisse sur le terrain.
 */
function resolveLocations(rows: ResourceRow[], waterSources: ResourceRow[]) {
    const located = [...rows, ...waterSources]
        .map(latLngOf)
        .filter((point): point is LatLng => point !== null);

    const center: LatLng = located.length
        ? {
              lat: located.reduce((sum, point) => sum + point.lat, 0) / located.length,
              lng: located.reduce((sum, point) => sum + point.lng, 0) / located.length,
          }
        : DEFAULT_CENTER;

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

    return {
        center,
        plotLocations: fill(rows),
        waterLocations: fill(waterSources),
        allPoints: [...rows, ...waterSources].length
            ? [
                  ...[...fill(rows).values()],
                  ...[...fill(waterSources).values()],
              ]
            : [],
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

type SceneApi = {
    setMode: (mode: NavMode) => void;
    setHour: (hour: number) => void;
    setVisibility: (visibility: {
        plots?: boolean;
        water?: boolean;
        labels?: boolean;
        terrain?: boolean;
        links?: boolean;
    }) => void;
    setStatusFilter: (statuses: Record<string, boolean>) => void;
    focusOn: (id: string | number) => void;
    resetView: () => void;
};

const colorToHex = (value: number): string => `#${value.toString(16).padStart(6, '0')}`;

export function Plots3D({ rows, waterSources, irrigations = [] }: Plots3DProps) {
    const host = useRef<HTMLDivElement>(null);
    const target = useRef<HTMLDivElement>(null);
    const wrapper = useRef<HTMLDivElement>(null);
    const api = useRef<SceneApi | null>(null);

    const [status, setStatus] = useState<Status>('loading');
    const [zoomLabel, setZoomLabel] = useState('');
    const [mode, setMode] = useState<NavMode>('orbit');
    const [hour, setHour] = useState(14);
    const [locked, setLocked] = useState(false);
    const [showPlots, setShowPlots] = useState(true);
    const [showWater, setShowWater] = useState(true);
    const [showLabels, setShowLabels] = useState(true);
    const [showLinks, setShowLinks] = useState(true);
    const [fullscreen, setFullscreen] = useState(false);
    const [statuses, setStatuses] = useState<Record<string, boolean>>({
        disponible: true,
        en_culture: true,
        en_repos: true,
        indisponible: true,
    });
    const [selected, setSelected] = useState<{ kind: 'plot' | 'water'; row: ResourceRow } | null>(null);

    const visibility = useRef({ plots: true, water: true, labels: true, terrain: true, links: true });
    const modeRef = useRef<NavMode>('orbit');

    useEffect(() => {
        const container = host.current;
        if (!container) return;

        let disposed = false;
        let frame = 0;
        const disposables: Array<() => void> = [];

        const disposeAll = () => {
            disposables.forEach((dispose) => dispose());
            disposables.length = 0;
        };

        const boot = async () => {
            let webgl: THREE.WebGLRenderer;

            try {
                webgl = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
            } catch {
                setStatus('error');
                return;
            }

            webgl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            webgl.setSize(container.clientWidth, container.clientHeight);
            webgl.shadowMap.enabled = true;
            webgl.shadowMap.type = THREE.PCFSoftShadowMap;
            webgl.toneMapping = THREE.ACESFilmicToneMapping;
            webgl.toneMappingExposure = 0.62;
            webgl.outputColorSpace = THREE.SRGBColorSpace;
            container.appendChild(webgl.domElement);

            // Nettoyage précoce : si le composant est démonté pendant le
            // chargement asynchrone des tuiles, le contexte WebGL ne fuit pas.
            disposables.push(() => {
                cancelAnimationFrame(frame);
                api.current = null;
                webgl.dispose();
                webgl.domElement.remove();
            });

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(
                58,
                Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1),
                0.5,
                60000,
            );

            const sky = new Sky();
            sky.scale.setScalar(30000);
            scene.add(sky);

            const skyMaterial = sky.material as THREE.ShaderMaterial;
            skyMaterial.uniforms.turbidity.value = 8;
            skyMaterial.uniforms.rayleigh.value = 2.2;
            skyMaterial.uniforms.mieCoefficient.value = 0.005;
            skyMaterial.uniforms.mieDirectionalG.value = 0.8;

            const sunDirection = new THREE.Vector3();
            const sunLight = new THREE.DirectionalLight(0xffffff, 3);
            sunLight.castShadow = true;
            sunLight.shadow.mapSize.set(2048, 2048);
            sunLight.shadow.bias = -0.0006;
            sunLight.shadow.normalBias = 2;
            scene.add(sunLight);
            scene.add(sunLight.target);

            const hemi = new THREE.HemisphereLight(0xbfd8ea, 0x3f3a2f, 0.7);
            scene.add(hemi);

            const fog = new THREE.Fog(0xbfd8ea, 1000, 6000);
            scene.fog = fog;

            const locations = resolveLocations(rows, waterSources);
            const tileset = await loadTerrainTileset(locations.allPoints.length ? locations.allPoints : [locations.center]);

            if (disposed) {
                tileset.dispose();
                disposeAll();
                webgl.dispose();
                webgl.domElement.remove();
                return;
            }

            const worldSize = tileset.worldSize;
            const shadowCamera = sunLight.shadow.camera as THREE.OrthographicCamera;
            shadowCamera.left = -worldSize * 0.9;
            shadowCamera.right = worldSize * 0.9;
            shadowCamera.top = worldSize * 0.9;
            shadowCamera.bottom = -worldSize * 0.9;
            shadowCamera.near = 1;
            shadowCamera.far = worldSize * 6;
            shadowCamera.updateProjectionMatrix();
            const exaggeration = VERTICAL_EXAGGERATION;
            const yOffset = -tileset.minElevation * exaggeration;
            const heightAt = (x: number, z: number) => tileset.heightAt(x, z) * exaggeration + yOffset;

            // --- Terrain -----------------------------------------------------
            let groundTexture = tileset.colorTexture;
            let generatedTexture: THREE.Texture | null = null;

            if (!tileset.hasImagery) {
                generatedTexture = proceduralGroundTexture();
                generatedTexture.repeat.set(Math.max(8, Math.round(worldSize / 40)), Math.max(8, Math.round(worldSize / 40)));
                groundTexture = generatedTexture;
            }

            const columns = RESOLUTION + 1;
            const vertexCount = columns * columns;
            const positions = new Float32Array(vertexCount * 3);
            const uvs = new Float32Array(vertexCount * 2);

            for (let rowIndex = 0; rowIndex < columns; rowIndex += 1) {
                for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
                    const x = -worldSize / 2 + (columnIndex / RESOLUTION) * worldSize;
                    const z = -worldSize / 2 + (rowIndex / RESOLUTION) * worldSize;
                    const offset = (rowIndex * columns + columnIndex) * 3;

                    positions[offset] = x;
                    positions[offset + 1] = heightAt(x, z);
                    positions[offset + 2] = z;

                    const uvOffset = (rowIndex * columns + columnIndex) * 2;
                    uvs[uvOffset] = columnIndex / RESOLUTION;
                    uvs[uvOffset + 1] = 1 - rowIndex / RESOLUTION;
                }
            }

            const indices: number[] = [];
            for (let rowIndex = 0; rowIndex < RESOLUTION; rowIndex += 1) {
                for (let columnIndex = 0; columnIndex < RESOLUTION; columnIndex += 1) {
                    const a = rowIndex * columns + columnIndex;
                    const b = a + 1;
                    const c = a + columns;
                    const d = c + 1;
                    indices.push(a, c, b, b, c, d);
                }
            }

            const terrainGeometry = new THREE.BufferGeometry();
            terrainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            terrainGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
            terrainGeometry.setIndex(indices);
            terrainGeometry.computeVertexNormals();

            const terrainMaterial = new THREE.MeshStandardMaterial({
                map: groundTexture,
                roughness: 0.97,
                metalness: 0,
            });

            const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
            terrain.receiveShadow = true;
            scene.add(terrain);

            disposables.push(
                () => terrainGeometry.dispose(),
                () => terrainMaterial.dispose(),
                () => groundTexture.dispose(),
                () => generatedTexture?.dispose(),
            );

            // --- Groupes -----------------------------------------------------
            const labelsGroup = new THREE.Group();
            const plotsGroup = new THREE.Group();
            const waterGroup = new THREE.Group();
            const linksGroup = new THREE.Group();
            scene.add(labelsGroup, plotsGroup, waterGroup, linksGroup);

            plotsGroup.visible = visibility.current.plots;
            waterGroup.visible = visibility.current.water;
            labelsGroup.visible = visibility.current.labels;
            linksGroup.visible = visibility.current.links;

            const labelScale = THREE.MathUtils.clamp(worldSize * 0.02, 8, 70);
            const pickTargets: THREE.Object3D[] = [];
            const anchors = new Map<string, THREE.Vector3>();

            const addLabel = (text: string, accent: string, x: number, y: number, z: number) => {
                const texture = labelTexture(text, accent);
                const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
                const sprite = new THREE.Sprite(material);
                sprite.scale.set(labelScale * 3.4, labelScale, 1);
                sprite.position.set(x, y, z);
                sprite.renderOrder = 10;
                labelsGroup.add(sprite);

                disposables.push(() => {
                    texture.dispose();
                    material.dispose();
                });

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
                disposables.push(() => material.dispose());

                let mesh: THREE.Mesh;
                let outline: THREE.LineLoop | null = null;

                if (ring) {
                    const contour = ring.map(([lng, lat]) => {
                        const point = tileset.project(lng, lat);
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
                    disposables.push(() => geometry.dispose());

                    const outlinePoints = contour.map(
                        (point) => new THREE.Vector3(point.x, heightAt(point.x, point.y) + 1.1, point.y),
                    );
                    const outlineGeometry = new THREE.BufferGeometry().setFromPoints(outlinePoints);
                    const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.5 });
                    outline = new THREE.LineLoop(outlineGeometry, outlineMaterial);
                    disposables.push(() => outlineGeometry.dispose(), () => outlineMaterial.dispose());
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
                    disposables.push(() => geometry.dispose());
                }

                mesh.castShadow = true;
                mesh.userData = { kind: 'plot', id: row.id, row, status: String(row.status ?? '') };
                plotsGroup.add(mesh);
                if (outline) {
                    plotsGroup.add(outline);
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
                const height = radius * (0.7 + ratio * 2.4);

                const geometry = new THREE.CylinderGeometry(radius, radius, height, 40, 1, false);
                geometry.translate(0, height / 2, 0);

                const material = new THREE.MeshStandardMaterial({
                    color: critical ? 0xef4444 : 0x38bdf8,
                    emissive: critical ? 0x7f1d1d : 0x0369a1,
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
                waterGroup.add(mesh);
                pickTargets.push(mesh);
                anchors.set(String(source.id), new THREE.Vector3(center.x, base, center.z));

                disposables.push(() => geometry.dispose(), () => material.dispose());

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
            disposables.push(() => linkMaterial.dispose());

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
                linksGroup.add(tube);
                disposables.push(() => geometry.dispose());
            }

            // --- Caméra & contrôles -----------------------------------------
            const overview = new THREE.Vector3(worldSize * 0.55, worldSize * 0.5, worldSize * 0.75);
            camera.position.copy(overview);

            const orbit = new OrbitControls(camera, webgl.domElement);
            orbit.enableDamping = true;
            orbit.dampingFactor = 0.08;
            orbit.maxPolarAngle = Math.PI * 0.49;
            orbit.minDistance = worldSize * 0.05;
            orbit.maxDistance = worldSize * 4;
            orbit.target.set(0, 0, 0);
            orbit.update();

            const pointerLock = new PointerLockControls(camera, webgl.domElement);
            pointerLock.enabled = false;

            disposables.push(() => {
                orbit.dispose();
                pointerLock.dispose();
            });

            const onLock = () => setLocked(true);
            const onUnlock = () => setLocked(false);
            pointerLock.addEventListener('lock', onLock);
            pointerLock.addEventListener('unlock', onUnlock);
            disposables.push(() => {
                pointerLock.removeEventListener('lock', onLock);
                pointerLock.removeEventListener('unlock', onUnlock);
            });

            // --- Soleil ------------------------------------------------------
            const applyHour = (value: number) => {
                const t = (value - 6) / 12;
                const elevation = Math.sin(THREE.MathUtils.clamp(t, 0, 1) * Math.PI) * 68 - 4;
                const azimuth = 95 + t * 170;
                const phi = THREE.MathUtils.degToRad(90 - elevation);
                const theta = THREE.MathUtils.degToRad(azimuth);

                sunDirection.setFromSphericalCoords(1, phi, theta);
                skyMaterial.uniforms.sunPosition.value.copy(sunDirection);

                const daylight = THREE.MathUtils.clamp(Math.sin(THREE.MathUtils.degToRad(Math.max(elevation, 0))), 0, 1);

                sunLight.position.copy(sunDirection).multiplyScalar(worldSize * 2);
                sunLight.target.position.set(0, 0, 0);
                sunLight.intensity = 0.1 + daylight * 3.1;

                const warm = new THREE.Color(0xffb066);
                const noon = new THREE.Color(0xfff4e6);
                sunLight.color.copy(warm).lerp(noon, daylight);

                hemi.intensity = 0.12 + daylight * 0.75;

                const night = new THREE.Color(0x0b1220);
                const day = new THREE.Color(0xbfd8ea);
                fog.color.copy(night).lerp(day, daylight);
                fog.near = worldSize * 0.9;
                fog.far = worldSize * 3.2;
                webgl.setClearColor(fog.color);
            };

            applyHour(hour);

            // --- Interaction -------------------------------------------------
            const raycaster = new THREE.Raycaster();
            const pointer = new THREE.Vector2();
            let selectedMesh: THREE.Mesh | null = null;
            const pressed = new Set<string>();
            const clock = new THREE.Clock();

            const setSelectedMesh = (mesh: THREE.Mesh | null) => {
                if (selectedMesh) {
                    const previous = selectedMesh.material as THREE.MeshStandardMaterial;
                    previous.emissiveIntensity = selectedMesh.userData.baseEmissive ?? 0.12;
                }

                selectedMesh = mesh;

                if (mesh) {
                    const material = mesh.material as THREE.MeshStandardMaterial;
                    mesh.userData.baseEmissive = mesh.userData.baseEmissive ?? material.emissiveIntensity;
                    material.emissiveIntensity = 0.85;
                    const kind = mesh.userData.kind === 'water' ? 'water' : 'plot';
                    setSelected({ kind, row: mesh.userData.row as ResourceRow });
                } else {
                    setSelected(null);
                }
            };

            const pickAt = (ndcX: number, ndcY: number) => {
                pointer.set(ndcX, ndcY);
                raycaster.setFromCamera(pointer, camera);
                const hits = raycaster.intersectObjects(pickTargets, false);
                setSelectedMesh(hits.length ? (hits[0].object as THREE.Mesh) : null);
            };

            let downX = 0;
            let downY = 0;

            const onPointerDown = (event: PointerEvent) => {
                downX = event.clientX;
                downY = event.clientY;
            };

            const onPointerUp = (event: PointerEvent) => {
                const moved = Math.hypot(event.clientX - downX, event.clientY - downY);

                if (modeRef.current !== 'orbit' || moved > 6) return;

                const rect = webgl.domElement.getBoundingClientRect();
                pickAt(
                    ((event.clientX - rect.left) / rect.width) * 2 - 1,
                    -((event.clientY - rect.top) / rect.height) * 2 + 1,
                );
            };

            const onClick = () => {
                if (modeRef.current !== 'orbit' && !pointerLock.isLocked) {
                    pointerLock.lock();
                }
            };

            const onKeyDown = (event: KeyboardEvent) => {
                pressed.add(event.code);
                if (modeRef.current !== 'orbit' && pointerLock.isLocked) {
                    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
                        event.preventDefault();
                    }
                    if (event.code === 'KeyE') {
                        pickAt(0, 0);
                    }
                }
            };

            const onKeyUp = (event: KeyboardEvent) => {
                pressed.delete(event.code);
            };

            webgl.domElement.addEventListener('pointerdown', onPointerDown);
            webgl.domElement.addEventListener('pointerup', onPointerUp);
            webgl.domElement.addEventListener('click', onClick);
            window.addEventListener('keydown', onKeyDown);
            window.addEventListener('keyup', onKeyUp);
            disposables.push(() => {
                webgl.domElement.removeEventListener('pointerdown', onPointerDown);
                webgl.domElement.removeEventListener('pointerup', onPointerUp);
                webgl.domElement.removeEventListener('click', onClick);
                window.removeEventListener('keydown', onKeyDown);
                window.removeEventListener('keyup', onKeyUp);
            });

            const forward = new THREE.Vector3();
            const right = new THREE.Vector3();
            const displacement = new THREE.Vector3();

            const moveCamera = (delta: number) => {
                const boost = pressed.has('ShiftLeft') || pressed.has('ShiftRight') ? 3 : 1;
                const speed = 22 * boost;

                forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
                right.set(1, 0, 0).applyQuaternion(camera.quaternion);
                forward.y = 0;
                right.y = 0;

                if (forward.lengthSq() > 0) forward.normalize();
                if (right.lengthSq() > 0) right.normalize();

                displacement.set(0, 0, 0);

                if (pressed.has('KeyW') || pressed.has('KeyZ') || pressed.has('ArrowUp')) displacement.add(forward);
                if (pressed.has('KeyS') || pressed.has('ArrowDown')) displacement.sub(forward);
                if (pressed.has('KeyD') || pressed.has('ArrowRight')) displacement.add(right);
                if (pressed.has('KeyA') || pressed.has('KeyQ') || pressed.has('ArrowLeft')) displacement.sub(right);

                if (displacement.lengthSq() > 0) {
                    displacement.normalize().multiplyScalar(speed * delta);
                    camera.position.add(displacement);
                }

                const walking = modeRef.current === 'walk';
                const groundY = heightAt(camera.position.x, camera.position.z) + 1.9;

                if (walking) {
                    camera.position.y = groundY;
                } else {
                    if (pressed.has('Space')) camera.position.y += speed * delta;
                    if (pressed.has('ControlLeft') || pressed.has('KeyC')) camera.position.y -= speed * delta;
                    if (camera.position.y < groundY) camera.position.y = groundY;
                }
            };

            let frameCounter = 0;

            const animate = () => {
                frame = requestAnimationFrame(animate);
                const delta = Math.min(clock.getDelta(), 0.08);

                if (modeRef.current === 'orbit') {
                    orbit.update();
                } else if (pointerLock.isLocked) {
                    moveCamera(delta);
                }

                if (modeRef.current !== 'orbit') {
                    frameCounter += 1;
                    if (frameCounter % 6 === 0 && target.current) {
                        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
                        const hits = raycaster.intersectObjects(pickTargets, false);
                        const hit = hits.length ? (hits[0].object.userData.row as ResourceRow) : null;
                        target.current.textContent = hit ? `${hit.code ?? ''} · ${hit.name ?? ''}` : '';
                    }
                }

                webgl.render(scene, camera);
            };

            const observer = new ResizeObserver(() => {
                if (!container.clientWidth || !container.clientHeight) return;
                camera.aspect = container.clientWidth / container.clientHeight;
                camera.updateProjectionMatrix();
                webgl.setSize(container.clientWidth, container.clientHeight);
            });
            observer.observe(container);
            disposables.push(() => observer.disconnect());

            // --- API exposée à l'interface ----------------------------------
            api.current = {
                setMode: (next) => {
                    if (next === 'orbit') {
                        pointerLock.unlock();
                        orbit.enabled = true;
                        orbit.update();
                    } else {
                        orbit.enabled = false;
                    }
                    pointerLock.enabled = next !== 'orbit';
                },
                setHour: (value) => applyHour(value),
                setVisibility: (next) => {
                    if (next.plots !== undefined) plotsGroup.visible = next.plots;
                    if (next.water !== undefined) waterGroup.visible = next.water;
                    if (next.labels !== undefined) labelsGroup.visible = next.labels;
                    if (next.terrain !== undefined) terrain.visible = next.terrain;
                    if (next.links !== undefined) linksGroup.visible = next.links;
                },
                setStatusFilter: (filter) => {
                    for (const child of plotsGroup.children) {
                        const status = String(child.userData?.status ?? '');
                        if (!status) continue;
                        const visible = filter[status] !== false;
                        child.visible = visible;
                        const label = child.userData?.label as THREE.Sprite | undefined;
                        if (label) label.visible = visible;
                        const outline = child.userData?.outline as THREE.Object3D | undefined;
                        if (outline) outline.visible = visible;
                    }
                },
                focusOn: (id) => {
                    const point = anchors.get(String(id));
                    if (!point) return;

                    if (modeRef.current !== 'orbit') {
                        modeRef.current = 'orbit';
                        setMode('orbit');
                        api.current?.setMode('orbit');
                    }

                    const distance = worldSize * 0.12;
                    orbit.target.copy(point);
                    camera.position.set(
                        point.x + distance * 0.7,
                        point.y + distance * 0.55,
                        point.z + distance * 0.7,
                    );
                    orbit.update();
                },
                resetView: () => {
                    camera.position.copy(overview);
                    orbit.target.set(0, 0, 0);
                    orbit.update();
                    setSelectedMesh(null);
                },
            };

            api.current.setMode(modeRef.current);
            api.current.setVisibility(visibility.current);
            api.current.setStatusFilter(statuses);

            setStatus(tileset.hasImagery && tileset.hasElevation ? 'ready' : 'procedural');
            setZoomLabel(`${tileset.center.lat.toFixed(4)}, ${tileset.center.lng.toFixed(4)} · z${tileset.zoom}`);

            animate();

            disposables.push(() => {
                cancelAnimationFrame(frame);
                api.current = null;
                webgl.dispose();
                webgl.domElement.remove();
            });
        };

        void boot();

        return () => {
            disposed = true;
            cancelAnimationFrame(frame);
            disposeAll();
            api.current = null;
        };
    }, [rows, waterSources, irrigations]);

    // Applique le mode courant aux contrôles recréés après un changement de données.
    useEffect(() => {
        modeRef.current = mode;
        api.current?.setMode(mode);
    }, [mode]);

    useEffect(() => {
        api.current?.setHour(hour);
    }, [hour]);

    useEffect(() => {
        api.current?.setStatusFilter(statuses);
    }, [statuses]);

    const chooseMode = (next: NavMode) => {
        modeRef.current = next;
        setMode(next);
        setLocked(false);
    };

    const toggle = (key: 'plots' | 'water' | 'labels' | 'links') => {
        const current = key === 'plots' ? showPlots : key === 'water' ? showWater : key === 'labels' ? showLabels : showLinks;
        const nextValue = !current;

        if (key === 'plots') setShowPlots(nextValue);
        if (key === 'water') setShowWater(nextValue);
        if (key === 'labels') setShowLabels(nextValue);
        if (key === 'links') setShowLinks(nextValue);

        visibility.current[key] = nextValue;
        api.current?.setVisibility({ [key]: nextValue });
    };

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

    const modeButton = (value: NavMode, label: string, Icon: typeof Gamepad2) => (
        <button
            type="button"
            onClick={() => chooseMode(value)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                mode === value ? 'bg-brand-600 text-white' : 'bg-white/85 text-ink-700 hover:bg-white'
            }`}
        >
            <Icon aria-hidden="true" className="size-3.5" />
            {label}
        </button>
    );

    return (
        <div className="space-y-3">
            <div ref={wrapper} className="relative">
                <div
                    ref={host}
                    className={fullscreen ? 'h-screen w-full' : 'h-[620px] w-full overflow-hidden rounded-2xl border border-ink-100 bg-slate-900'}
                />

                {status === 'loading' && (
                    <div className="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-slate-900/80 text-center text-sm text-white backdrop-blur">
                        <div className="space-y-2">
                            <Mountain aria-hidden="true" className="mx-auto size-8 animate-pulse text-brand-300" />
                            <p className="font-semibold">Chargement du relief et de l’imagerie satellite…</p>
                            <p className="text-xs text-white/60">Le terrain réel de l’exploitation est en cours de génération.</p>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-slate-900/90 text-center text-sm text-white">
                        <p>WebGL n’est pas disponible sur cet appareil — la vue 3D est désactivée.</p>
                    </div>
                )}

                {status !== 'loading' && status !== 'error' && (
                    <>
                        {/* Barre d'outils */}
                        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 p-2 backdrop-blur">
                                {modeButton('orbit', 'Vue d’ensemble', Focus)}
                                {modeButton('fly', 'Vol', Plane)}
                                {modeButton('walk', 'Marche', Gamepad2)}
                            </div>

                            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-white backdrop-blur">
                                <Sun aria-hidden="true" className="size-4 text-amber-300" />
                                <input
                                    type="range"
                                    min={0}
                                    max={24}
                                    step={0.25}
                                    value={hour}
                                    onChange={(event) => setHour(Number(event.target.value))}
                                    className="h-1.5 w-40 accent-amber-400"
                                    aria-label="Heure de la journée"
                                />
                                <span className="w-12 tabular-nums">
                                    {String(Math.floor(hour)).padStart(2, '0')}:
                                    {String(Math.round((hour % 1) * 60)).padStart(2, '0')}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/60 p-2 text-xs backdrop-blur">
                                <button
                                    type="button"
                                    onClick={() => toggle('plots')}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium ${
                                        showPlots ? 'bg-brand-600 text-white' : 'bg-white/85 text-ink-700'
                                    }`}
                                >
                                    {showPlots ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                                    Parcelles
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggle('water')}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium ${
                                        showWater ? 'bg-sky-600 text-white' : 'bg-white/85 text-ink-700'
                                    }`}
                                >
                                    <Droplets className="size-3.5" />
                                    Eau
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggle('labels')}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium ${
                                        showLabels ? 'bg-brand-600 text-white' : 'bg-white/85 text-ink-700'
                                    }`}
                                >
                                    <Box className="size-3.5" />
                                    Étiquettes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggle('links')}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium ${
                                        showLinks ? 'bg-sky-600 text-white' : 'bg-white/85 text-ink-700'
                                    }`}
                                >
                                    <CloudRain className="size-3.5" />
                                    Irrigations
                                </button>
                                <button
                                    type="button"
                                    onClick={() => api.current?.resetView()}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/85 px-2 py-1 font-medium text-ink-700 hover:bg-white"
                                >
                                    <Focus className="size-3.5" />
                                    Recentrer
                                </button>
                            </div>

                            {/* Filtres par statut */}
                            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/60 p-2 text-xs backdrop-blur">
                                {STATUS_LEGEND.map((item) => (
                                    <label
                                        key={item.key}
                                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/85 px-2 py-1 font-medium text-ink-700"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={statuses[item.key] !== false}
                                            onChange={(event) =>
                                                setStatuses((current) => ({ ...current, [item.key]: event.target.checked }))
                                            }
                                            className="accent-brand-600"
                                        />
                                        <span
                                            className="inline-block size-2.5 rounded-full"
                                            style={{ backgroundColor: colorToHex(STATUS_COLORS[item.key] ?? 0x64748b) }}
                                        />
                                        {item.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Plein écran */}
                        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={() => void toggleFullscreen()}
                                className="rounded-lg border border-white/10 bg-slate-900/60 p-2 text-white backdrop-blur hover:bg-slate-900/80"
                                aria-label={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
                            >
                                {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                            </button>
                        </div>

                        {/* Réticule en navigation */}
                        {mode !== 'orbit' && (
                            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
                                <div className="flex flex-col items-center gap-3">
                                    <span className="size-2.5 rounded-full border border-white/80 bg-white/20" />
                                    <div
                                        ref={target}
                                        className="rounded-md bg-slate-900/70 px-2 py-0.5 text-xs font-medium text-white"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Légende */}
                        <div className="absolute bottom-3 left-3 z-10 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-xs text-white backdrop-blur">
                            <p className="mb-1 font-semibold">Légende</p>
                            <ul className="space-y-0.5">
                                {STATUS_LEGEND.map((item) => (
                                    <li key={item.key} className="flex items-center gap-2 text-white/80">
                                        <span
                                            className="inline-block size-3 rounded-full"
                                            style={{ backgroundColor: colorToHex(STATUS_COLORS[item.key] ?? 0x64748b) }}
                                        />
                                        {item.label}
                                    </li>
                                ))}
                                <li className="flex items-center gap-2 text-white/80">
                                    <span className="inline-block size-3 rounded-full bg-sky-400" />
                                    Point d’eau
                                </li>
                                <li className="flex items-center gap-2 text-white/80">
                                    <span className="inline-block h-0.5 w-3 rounded bg-sky-300" />
                                    Lien d’irrigation
                                </li>
                            </ul>
                        </div>

                        {/* Repère de localisation */}
                        <div className="absolute right-3 bottom-3 z-10 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-right text-xs text-white/80 backdrop-blur">
                            <p className="font-semibold text-white">Terrain réel</p>
                            <p className="tabular-nums">{zoomLabel}</p>
                        </div>

                        {/* Astuces de navigation */}
                        {mode !== 'orbit' && !locked && (
                            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
                                <div className="rounded-xl border border-white/15 bg-slate-900/80 px-5 py-3 text-center text-sm text-white backdrop-blur">
                                    <p className="font-semibold">Cliquez pour entrer en navigation</p>
                                    <p className="mt-1 text-xs text-white/70">
                                        ZQSD / WASD pour se déplacer · Souris pour regarder · Échap pour sortir
                                    </p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Panneau de sélection */}
            {selected && (
                <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-display text-base font-bold text-ink-900">
                            {selected.kind === 'water'
                                ? String(selected.row.name ?? '')
                                : `${String(selected.row.code ?? '')} · ${String(selected.row.name ?? '')}`}
                        </p>
                        <button
                            type="button"
                            onClick={() => api.current?.focusOn(selected.row.id as string | number)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                        >
                            <Crosshair className="size-3.5" />
                            Centrer
                        </button>
                    </div>

                    {selected.kind === 'water' ? (
                        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                            <Detail label="Type" value={humanize(String(selected.row.type ?? '—'))} />
                            <Detail
                                label="Quantité"
                                value={`${selected.row.available_quantity ?? 0} / ${selected.row.capacity ?? 0} ${selected.row.unit ?? ''}`.trim()}
                            />
                            <Detail label="Seuil critique" value={`${selected.row.critical_threshold ?? '—'} ${selected.row.unit ?? ''}`.trim()} />
                            <Detail label="Statut" value={humanize(String(selected.row.status ?? '—'))} />
                        </dl>
                    ) : (
                        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                            <Detail label="Statut" value={humanize(String(selected.row.status ?? '—'))} />
                            <Detail label="Surface" value={`${selected.row.area ?? '—'} ${selected.row.area_unit ?? ''}`.trim()} />
                            <Detail label="Priorité" value={humanize(String(selected.row.manual_priority ?? '—'))} />
                            <Detail
                                label="Humidité"
                                value={selected.row.soil_moisture === null || selected.row.soil_moisture === undefined ? '—' : `${selected.row.soil_moisture} %`}
                            />
                        </dl>
                    )}
                </div>
            )}
        </div>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg bg-ink-50 px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-ink-400">{label}</dt>
            <dd className="mt-0.5 font-semibold text-ink-800">{value}</dd>
        </div>
    );
}
