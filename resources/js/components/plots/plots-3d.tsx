import {
    Box,
    CloudRain,
    Crosshair,
    Droplets,
    Focus,
    Gamepad2,
    Gauge,
    Maximize2,
    Minimize2,
    Mountain,
    Pause,
    Play,
    Plane,
    Sun,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

import type { ResourceRow } from '../../resources/types';
import { humanize } from '../app/status-badge';
import { createProceduralTileset, loadTerrainTileset, type TerrainTileset } from './terrain';
import { DayNightCycle, DAY_LENGTHS } from './scene/day-night';
import {
    buildEntities,
    colorToHex,
    locatedCount,
    resolveEntityLocations,
    STATUS_COLORS,
    STATUS_LEGEND,
} from './scene/entities';
import { detectInitialQuality, QUALITY_PROFILES, type QualityLevel, type QualityProfile } from './scene/quality';
import { Vegetation } from './scene/vegetation';
import { WaterSurfaces } from './scene/water';
import { WeatherSystem, WEATHERS, type WeatherId } from './scene/weather';

export type Plots3DProps = {
    rows: ResourceRow[];
    waterSources: ResourceRow[];
    irrigations?: ResourceRow[];
};

type NavMode = 'orbit' | 'fly' | 'walk';
type Status = 'loading' | 'ready' | 'procedural' | 'error';
type LayerKey = 'plots' | 'water' | 'labels' | 'links' | 'terrain';

const RESOLUTION = 160;
const VERTICAL_EXAGGERATION = 1.6;
/** Actualisation du curseur d'heure pendant le cycle en cours. */
const HOUR_SYNC_MS = 250;

type SceneApi = {
    setMode: (mode: NavMode) => void;
    setHour: (hour: number) => void;
    setDayLength: (seconds: number) => void;
    setWeather: (weather: WeatherId) => void;
    setQuality: (profile: QualityProfile) => void;
    setVisibility: (visibility: Partial<Record<LayerKey, boolean>>) => void;
    setStatusFilter: (statuses: Record<string, boolean>) => void;
    focusOn: (id: string | number) => void;
    resetView: () => void;
};

export function Plots3D({ rows, waterSources, irrigations = [] }: Plots3DProps) {
    const host = useRef<HTMLDivElement>(null);
    const target = useRef<HTMLDivElement>(null);
    const wrapper = useRef<HTMLDivElement>(null);
    const api = useRef<SceneApi | null>(null);

    /** Signature des données : la scène n'est reconstruite que si elles changent. */
    const dataKey = useMemo(() => JSON.stringify([rows, waterSources, irrigations]), [rows, waterSources, irrigations]);
    const dataRef = useRef({ rows, waterSources, irrigations });
    dataRef.current = { rows, waterSources, irrigations };

    const [status, setStatus] = useState<Status>('loading');
    const [sceneOrigin, setSceneOrigin] = useState<'satellite' | 'relief' | 'procedural'>('procedural');
    const [mapLabel, setMapLabel] = useState('');
    const [mode, setMode] = useState<NavMode>('orbit');
    const [hour, setHour] = useState(14);
    const [playing, setPlaying] = useState(false);
    const [dayLength, setDayLength] = useState('10min');
    const [weather, setWeather] = useState<WeatherId>('clair');
    const [quality, setQuality] = useState<QualityLevel>(() => detectInitialQuality().id);
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

    const visibility = useRef<Record<LayerKey, boolean>>({
        plots: true,
        water: true,
        labels: true,
        terrain: true,
        links: true,
    });
    const modeRef = useRef<NavMode>('orbit');
    const sceneHour = useRef<number | null>(null);

    /** Entités réellement géolocalisées (le reste est explicitement estimé). */
    const located = useMemo(() => locatedCount(rows, waterSources), [rows, waterSources]);
    const total = rows.length + waterSources.length;

    useEffect(() => {
        const container = host.current;
        if (!container) return;

        let disposed = false;
        let frame = 0;
        const disposers: Array<() => void> = [];

        const disposeAll = () => {
            disposers.forEach((dispose) => dispose());
            disposers.length = 0;
        };

        const boot = async () => {
            let webgl: THREE.WebGLRenderer;

            try {
                webgl = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
            } catch {
                setStatus('error');
                return;
            }

            const initialProfile = QUALITY_PROFILES[quality] ?? detectInitialQuality();
            webgl.setPixelRatio(Math.min(window.devicePixelRatio, initialProfile.maxPixelRatio));
            webgl.setSize(container.clientWidth, container.clientHeight);
            webgl.shadowMap.enabled = true;
            webgl.shadowMap.type = THREE.PCFSoftShadowMap;
            webgl.toneMapping = THREE.ACESFilmicToneMapping;
            webgl.toneMappingExposure = 0.62;
            webgl.outputColorSpace = THREE.SRGBColorSpace;
            container.appendChild(webgl.domElement);

            // Nettoyage précoce : si le composant est démonté pendant le
            // chargement asynchrone des tuiles, le contexte WebGL ne fuit pas.
            disposers.push(() => {
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

            const sunLight = new THREE.DirectionalLight(0xffffff, 3);
            sunLight.castShadow = true;
            sunLight.shadow.mapSize.set(initialProfile.shadowMapSize, initialProfile.shadowMapSize);
            sunLight.shadow.bias = -0.0006;
            sunLight.shadow.normalBias = 2;
            scene.add(sunLight);
            scene.add(sunLight.target);

            const moonLight = new THREE.DirectionalLight(0x93b4ff, 0);
            scene.add(moonLight);

            const hemi = new THREE.HemisphereLight(0xbfd8ea, 0x3f3a2f, 0.7);
            scene.add(hemi);

            const fog = new THREE.Fog(0xbfd8ea, 1000, 6000);
            scene.fog = fog;

            const { rows: currentRows, waterSources: currentWater, irrigations: currentIrrigations } = dataRef.current;
            const locations = resolveEntityLocations(currentRows, currentWater);
            const hasGeo = locatedCount(currentRows, currentWater) > 0;

            let tileset: TerrainTileset | null = null;
            if (hasGeo) {
                tileset = await loadTerrainTileset(locations.allPoints.length ? locations.allPoints : [locations.center]);
            }
            if (!tileset || (!tileset.hasImagery && !tileset.hasElevation)) {
                tileset?.dispose();
                tileset = createProceduralTileset();
            }

            const terrain = tileset;

            if (disposed) {
                terrain.dispose();
                disposeAll();
                webgl.dispose();
                webgl.domElement.remove();
                return;
            }

            const worldSize = terrain.worldSize;
            const shadowCamera = sunLight.shadow.camera as THREE.OrthographicCamera;
            shadowCamera.left = -worldSize * 0.9;
            shadowCamera.right = worldSize * 0.9;
            shadowCamera.top = worldSize * 0.9;
            shadowCamera.bottom = -worldSize * 0.9;
            shadowCamera.near = 1;
            shadowCamera.far = worldSize * 6;
            shadowCamera.updateProjectionMatrix();

            const yOffset = -terrain.minElevation * VERTICAL_EXAGGERATION;
            const heightAt = (x: number, z: number) =>
                terrain.heightAt(x, z) * VERTICAL_EXAGGERATION + yOffset;

            // --- Terrain -----------------------------------------------------
            const groundTexture = terrain.colorTexture;

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
                roughness: 0.85,
                metalness: 0,
            });

            const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
            terrainMesh.receiveShadow = true;
            scene.add(terrainMesh);

            disposers.push(
                () => terrainGeometry.dispose(),
                () => terrainMaterial.dispose(),
                () => groundTexture.dispose(),
                () => terrain.dispose(),
            );

            // --- Entités métier (identifiants réels conservés) ---------------
            const entities = buildEntities({
                rows: currentRows,
                waterSources: currentWater,
                irrigations: currentIrrigations,
                tileset: terrain,
                heightAt,
                disposers,
            });

            scene.add(entities.labels, entities.plots, entities.water, entities.links);

            const waterSurfaces = new WaterSurfaces({
                scene,
                sources: entities.waterVisuals,
                decor: terrain.decor,
                heightAt,
                worldSize,
            });
            disposers.push(() => waterSurfaces.dispose());

            const vegetation = new Vegetation({
                scene,
                heightAt,
                worldSize,
                profile: initialProfile,
                exclude: entities.exclude,
            });
            disposers.push(() => vegetation.dispose());

            // --- Cycle jour/nuit & météo -------------------------------------
            const dayNight = new DayNightCycle({
                sky,
                sun: sunLight,
                moon: moonLight,
                hemi,
                fog,
                renderer: webgl,
                worldSize,
            });

            const weatherSystem = new WeatherSystem({
                scene,
                fog,
                sun: sunLight,
                hemi,
                terrainMaterial,
                worldSize,
                profile: initialProfile,
            });
            weatherSystem.setWeather(weather);
            disposers.push(() => weatherSystem.dispose());

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

            disposers.push(() => {
                orbit.dispose();
                pointerLock.dispose();
            });

            const onLock = () => setLocked(true);
            const onUnlock = () => setLocked(false);
            pointerLock.addEventListener('lock', onLock);
            pointerLock.addEventListener('unlock', onUnlock);
            disposers.push(() => {
                pointerLock.removeEventListener('lock', onLock);
                pointerLock.removeEventListener('unlock', onUnlock);
            });

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
                const hits = raycaster.intersectObjects(entities.pickTargets, false);
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
            disposers.push(() => {
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
            let lastHourSync = 0;

            const animate = () => {
                frame = requestAnimationFrame(animate);
                const delta = Math.min(clock.getDelta(), 0.08);

                dayNight.update(delta);
                weatherSystem.update(delta, camera, dayNight);
                waterSurfaces.update(delta, weatherSystem.rainIntensity, dayNight.daylight());
                vegetation.update(delta, weatherSystem.wind, weatherSystem.rainIntensity);

                const now = performance.now();
                if (dayNight.playing && now - lastHourSync > HOUR_SYNC_MS) {
                    lastHourSync = now;
                    sceneHour.current = dayNight.hour;
                    setHour(dayNight.hour);
                }

                if (modeRef.current === 'orbit') {
                    orbit.update();
                } else if (pointerLock.isLocked) {
                    moveCamera(delta);
                }

                if (modeRef.current !== 'orbit') {
                    frameCounter += 1;
                    if (frameCounter % 6 === 0 && target.current) {
                        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
                        const hits = raycaster.intersectObjects(entities.pickTargets, false);
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
            disposers.push(() => observer.disconnect());

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
                setHour: (value) => dayNight.setHour(value),
                setDayLength: (seconds) => dayNight.setDayLength(seconds),
                setWeather: (value) => weatherSystem.setWeather(value),
                setQuality: (profile) => {
                    webgl.setPixelRatio(Math.min(window.devicePixelRatio, profile.maxPixelRatio));
                    webgl.setSize(container.clientWidth, container.clientHeight);

                    sunLight.shadow.mapSize.set(profile.shadowMapSize, profile.shadowMapSize);
                    sunLight.shadow.map?.dispose();
                    sunLight.shadow.map = null;
                    sunLight.castShadow = profile.shadows;
                    sunLight.shadow.camera.updateProjectionMatrix();

                    entities.plots.traverse((child) => {
                        if (child instanceof THREE.Mesh) child.castShadow = profile.shadows;
                    });

                    vegetation.setQuality(profile);
                    weatherSystem.setQuality(profile);
                },
                setVisibility: (next) => {
                    if (next.plots !== undefined) entities.plots.visible = next.plots;
                    if (next.water !== undefined) {
                        entities.water.visible = next.water;
                        waterSurfaces.visible = next.water;
                    }
                    if (next.labels !== undefined) entities.labels.visible = next.labels;
                    if (next.terrain !== undefined) terrainMesh.visible = next.terrain;
                    if (next.links !== undefined) entities.links.visible = next.links;
                },
                setStatusFilter: (filter) => {
                    for (const child of entities.plots.children) {
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
                    const point = entities.anchors.get(String(id));
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
            api.current.setWeather(weather);
            api.current.setDayLength(DAY_LENGTHS.find((item) => item.id === dayLength)?.seconds ?? 600);

            const origin: 'satellite' | 'relief' | 'procedural' = !hasGeo
                ? 'procedural'
                : terrain.hasImagery && terrain.hasElevation
                  ? 'satellite'
                  : 'relief';
            setStatus('ready');
            setSceneOrigin(origin);
            setMapLabel(
                origin === 'procedural'
                    ? 'Terrain généré · positions estimées'
                    : `${terrain.center.lat.toFixed(4)}, ${terrain.center.lng.toFixed(4)} · z${terrain.zoom}`,
            );

            animate();

            disposers.push(() => {
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
        // Le contenu des données est suivi par `dataKey` (voir ci-dessus).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataKey]);

    useEffect(() => {
        modeRef.current = mode;
        api.current?.setMode(mode);
    }, [mode]);

    useEffect(() => {
        if (sceneHour.current === hour) return;
        api.current?.setHour(hour);
    }, [hour]);

    useEffect(() => {
        api.current?.setStatusFilter(statuses);
    }, [statuses]);

    useEffect(() => {
        const option = DAY_LENGTHS.find((item) => item.id === dayLength);
        api.current?.setDayLength(option?.seconds ?? 600);
    }, [dayLength]);

    useEffect(() => {
        api.current?.setWeather(weather);
    }, [weather]);

    useEffect(() => {
        api.current?.setQuality(QUALITY_PROFILES[quality]);
    }, [quality]);

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

    const layerButton = (
        key: 'plots' | 'water' | 'labels' | 'links',
        label: string,
        Icon: typeof Box,
        active: boolean,
        activeClass: string,
    ) => (
        <button
            type="button"
            onClick={() => toggle(key)}
            title={active ? `Masquer ${label.toLowerCase()}` : `Afficher ${label.toLowerCase()}`}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium ${
                active ? `${activeClass} text-white` : 'bg-white/85 text-ink-400'
            }`}
        >
            <Icon aria-hidden="true" className="size-3.5" />
            {label}
        </button>
    );

    const totalMinutes = Math.round(hour * 60) % (24 * 60);
    const timeLabel = `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;

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
                            <p className="font-semibold">Chargement du relief et de l’environnement…</p>
                            <p className="text-xs text-white/60">Terrain, végétation et météo sont en cours de génération.</p>
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
                        <div className="absolute top-3 left-3 z-10 flex max-h-full flex-col gap-2 overflow-y-auto">
                            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 p-2 backdrop-blur">
                                {modeButton('orbit', 'Vue d’ensemble', Focus)}
                                {modeButton('fly', 'Vol', Plane)}
                                {modeButton('walk', 'Marche', Gamepad2)}
                            </div>

                            {/* Cycle jour / nuit */}
                            <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-white backdrop-blur">
                                <div className="flex items-center gap-2">
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
                                    <span className="w-12 tabular-nums">{timeLabel}</span>
                                    <button
                                        type="button"
                                        onClick={() => setPlaying((current) => !current)}
                                        className="rounded-lg bg-white/85 p-1.5 text-ink-700 hover:bg-white"
                                        aria-label={playing ? 'Mettre le cycle en pause' : 'Démarrer le cycle'}
                                    >
                                        {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                                    </button>
                                </div>
                                <label className="flex items-center gap-2 text-white/80">
                                    <span className="w-28">Journée virtuelle</span>
                                    <select
                                        value={dayLength}
                                        onChange={(event) => setDayLength(event.target.value)}
                                        className="rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1 text-xs text-white"
                                        aria-label="Durée d’une journée virtuelle"
                                    >
                                        {DAY_LENGTHS.map((option) => (
                                            <option key={option.id} value={option.id}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            {/* Météo */}
                            <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-slate-900/60 p-2 text-xs backdrop-blur">
                                <p className="flex items-center gap-1.5 px-1 font-semibold text-white/90">
                                    <CloudRain aria-hidden="true" className="size-3.5" />
                                    Météo simulée
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {WEATHERS.map((option) => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            title={option.description}
                                            onClick={() => setWeather(option.id)}
                                            className={`rounded-lg px-2 py-1 font-medium ${
                                                weather === option.id ? 'bg-sky-600 text-white' : 'bg-white/85 text-ink-700 hover:bg-white'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/60 p-2 text-xs backdrop-blur">
                                {layerButton('plots', 'Parcelles', Box, showPlots, 'bg-brand-600')}
                                {layerButton('water', 'Eau', Droplets, showWater, 'bg-sky-600')}
                                {layerButton('labels', 'Étiquettes', Gauge, showLabels, 'bg-brand-600')}
                                {layerButton('links', 'Irrigations', CloudRain, showLinks, 'bg-sky-600')}
                                <button
                                    type="button"
                                    onClick={() => api.current?.resetView()}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/85 px-2 py-1 font-medium text-ink-700 hover:bg-white"
                                >
                                    <Focus className="size-3.5" />
                                    Recentrer
                                </button>
                            </div>

                            {/* Qualité graphique */}
                            <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-slate-900/60 p-2 text-xs backdrop-blur">
                                <p className="flex items-center gap-1.5 px-1 font-semibold text-white/90">
                                    <Gauge aria-hidden="true" className="size-3.5" />
                                    Qualité
                                </p>
                                <div className="flex gap-1.5">
                                    {(['basse', 'moyenne', 'haute'] as QualityLevel[]).map((level) => (
                                        <button
                                            key={level}
                                            type="button"
                                            title={QUALITY_PROFILES[level].description}
                                            onClick={() => setQuality(level)}
                                            className={`rounded-lg px-2 py-1 font-medium ${
                                                quality === level ? 'bg-brand-600 text-white' : 'bg-white/85 text-ink-700 hover:bg-white'
                                            }`}
                                        >
                                            {QUALITY_PROFILES[level].label}
                                        </button>
                                    ))}
                                </div>
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

                        {/* Repère de localisation + honnêteté des positions */}
                        <div className="absolute right-3 bottom-3 z-10 max-w-xs rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-right text-xs text-white/80 backdrop-blur">
                            <p className="font-semibold text-white">
                                {sceneOrigin === 'satellite'
                                    ? 'Terrain réel (satellite + MNT)'
                                    : sceneOrigin === 'relief'
                                      ? 'Relief réel sans imagerie'
                                      : 'Relief procédural'}
                            </p>
                            <p className="tabular-nums">{mapLabel}</p>
                            <p className="mt-1 text-white/70">
                                {located === total
                                    ? `${total} entité${total > 1 ? 's' : ''} géolocalisée${total > 1 ? 's' : ''} depuis la base.`
                                    : `${located} / ${total} entités géolocalisées · positions estimées pour les autres.`}
                            </p>
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
                            <span className="ml-2 text-xs font-medium text-ink-400">
                                #{String(selected.row.id)}
                            </span>
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
                            <Detail
                                label="Position"
                                value={
                                    selected.row.latitude === null || selected.row.latitude === undefined
                                        ? 'Estimée'
                                        : `${String(selected.row.latitude)}, ${String(selected.row.longitude)}`
                                }
                            />
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
                            <Detail label="Sol" value={String(selected.row.soil_type ?? '—')} />
                            <Detail label="Emplacement" value={String(selected.row.location ?? '—')} />
                            <Detail
                                label="Position"
                                value={
                                    selected.row.latitude === null || selected.row.latitude === undefined
                                        ? 'Estimée'
                                        : `${String(selected.row.latitude)}, ${String(selected.row.longitude)}`
                                }
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
