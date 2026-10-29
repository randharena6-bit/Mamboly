import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import type { ResourceRow } from '../../../resources/types';
import type { FarmWorldOptions, PlotMarker, WaterMarker } from './core';
import {
    CROP_COLORS,
    POND,
    PASTURE,
    STATUS,
    WORLD_SIZE,
    YARD,
    clamp,
    cropPalette,
    disposeMaterial,
    heightAt,
    labelTexture,
    noiseTexture,
    plotSlots,
    rectMaxHeight,
    ribbon,
    smoothstep,
    sunTexture,
} from './core';
import {
    createBarn,
    createCow,
    createFarmer,
    createHayBales,
    createHouse,
    createSilo,
    createTractor,
    createWell,
    createWindmill,
} from './props';

function campaignStatusLabel(status: string): string {
    return status === 'planifiee'
        ? 'planifiée'
        : status === 'active'
          ? 'en culture'
          : status === 'suspendue'
            ? 'suspendue'
            : status === 'terminee'
              ? 'terminée'
              : status;
}

export class FarmWorld {
    readonly scene: THREE.Scene;
    readonly camera: THREE.PerspectiveCamera;
    readonly renderer: THREE.WebGLRenderer;

    private readonly options: FarmWorldOptions;
    private readonly clock = new THREE.Clock();
    private readonly orbit: OrbitControls;
    private readonly keys = new Set<string>();
    private readonly listeners: Array<() => void> = [];
    private readonly nightMaterials: THREE.MeshStandardMaterial[] = [];
    private readonly nightLights: THREE.MeshStandardMaterial[] = [];

    private frame = 0;
    private disposed = false;
    private ready = false;

    private mode: 'orbit' | 'walk' | 'drive' = 'orbit';
    private hour = 15.5;
    private autoTime = true;
    private lastTimeSync = 0;
    private lastMinimapSync = 0;

    private sun: THREE.DirectionalLight;
    private moon: THREE.DirectionalLight;
    private hemi: THREE.HemisphereLight;
    private sky: THREE.Mesh;
    private skyUniforms: {
        topColor: { value: THREE.Color };
        bottomColor: { value: THREE.Color };
    };
    private stars: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
    private starsMaterial: THREE.PointsMaterial;
    private sunDisc: THREE.Sprite;
    private skyDirection = new THREE.Vector3(0, 1, 0);

    private plots: PlotMarker[] = [];
    private water: WaterMarker[] = [];
    private pickables: THREE.Object3D[] = [];
    private selected: PlotMarker | WaterMarker | null = null;
    private hovered: PlotMarker | WaterMarker | null = null;
    private highlightCropId: string | null = null;

    private player = new THREE.Group();
    private playerPosition = new THREE.Vector3(4, 0, 31);
    private playerHeading = 0;
    private playerLegs: THREE.Object3D[] = [];
    private playerArms: THREE.Object3D[] = [];
    private walkPhase = 0;

    private tractor = new THREE.Group();
    private tractorPosition = new THREE.Vector3(-2, 0, 24);
    private tractorHeading = Math.PI * 0.85;
    private tractorSpeed = 0;
    private tractorWheels: THREE.Object3D[] = [];

    private windmillBlades: THREE.Object3D | null = null;
    private pondWater: THREE.Mesh | null = null;
    private pondBaseY = 0;

    private cameraYaw = Math.PI * 0.25;
    private cameraPitch = 0.38;
    private cameraDistance = 13;
    private pointer = { down: false, x: 0, y: 0, moved: 0 };
    private raycaster = new THREE.Raycaster();
    private pointerNdc = new THREE.Vector2();
    private resizeObserver: ResizeObserver | null = null;

    constructor(options: FarmWorldOptions) {
        this.options = options;

        this.renderer = new THREE.WebGLRenderer({
            canvas: options.canvas,
            antialias: true,
            powerPreference: 'high-performance',
        });
        const width = options.canvas.clientWidth || 900;
        const height = options.canvas.clientHeight || 620;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.5 : 2));
        this.renderer.setSize(width, height, false);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0xd8edf8, 135, 620);

        this.camera = new THREE.PerspectiveCamera(56, width / height, 0.5, 2200);
        this.camera.position.set(88, 74, 112);

        const sky = this.createSky();
        this.sky = sky.mesh;
        this.skyUniforms = sky.uniforms;
        this.scene.add(this.sky);

        const stars = this.createStars();
        this.stars = stars.points;
        this.starsMaterial = stars.material;
        this.scene.add(this.stars);

        this.sunDisc = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: sunTexture(),
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                fog: false,
            }),
        );
        this.sunDisc.scale.set(46, 46, 1);
        this.scene.add(this.sunDisc);

        this.hemi = new THREE.HemisphereLight(0xcfe7fb, 0x4e4a37, 1);
        this.scene.add(this.hemi);

        this.sun = new THREE.DirectionalLight(0xfff2d4, 2.8);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(window.innerWidth < 768 ? 1024 : 2048, window.innerWidth < 768 ? 1024 : 2048);
        this.sun.shadow.bias = -0.0004;
        this.sun.shadow.normalBias = 0.6;
        const shadowCamera = this.sun.shadow.camera as THREE.OrthographicCamera;
        shadowCamera.left = -135;
        shadowCamera.right = 135;
        shadowCamera.top = 135;
        shadowCamera.bottom = -135;
        shadowCamera.near = 1;
        shadowCamera.far = 420;
        shadowCamera.updateProjectionMatrix();
        this.scene.add(this.sun);
        this.scene.add(this.sun.target);

        this.moon = new THREE.DirectionalLight(0x9db8ff, 0);
        this.scene.add(this.moon);

        this.orbit = new OrbitControls(this.camera, options.canvas);
        this.orbit.target.set(0, 4, 0);
        this.orbit.enableDamping = true;
        this.orbit.dampingFactor = 0.06;
        this.orbit.minDistance = 28;
        this.orbit.maxDistance = 235;
        this.orbit.maxPolarAngle = Math.PI * 0.485;
        this.orbit.minPolarAngle = 0.2;
        this.orbit.update();

        this.buildWorld();
        this.bindEvents();
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(options.canvas);
        this.resize();
        this.applyMode('orbit');
        this.updateDaylight();
        this.animate();
    }

    // ------------------------------------------------------------------
    // Ciel et lumière
    // ------------------------------------------------------------------

    private createSky(): {
        mesh: THREE.Mesh;
        uniforms: { topColor: { value: THREE.Color }; bottomColor: { value: THREE.Color } };
    } {
        const uniforms = {
            topColor: { value: new THREE.Color(0x4b9fd8) },
            bottomColor: { value: new THREE.Color(0xd8edf8) },
            offset: { value: 18 },
            exponent: { value: 0.82 },
        };

        const material = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            depthWrite: false,
            fog: false,
            uniforms,
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
                    float mixFactor = pow(max(h, 0.0), exponent);
                    gl_FragColor = vec4(mix(bottomColor, topColor, mixFactor), 1.0);
                }
            `,
        });

        const mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 18), material);
        mesh.renderOrder = -10;

        return { mesh, uniforms };
    }

    private createStars(): {
        points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
        material: THREE.PointsMaterial;
    } {
        const positions: number[] = [];
        const random = (seed => {
            let value = seed;
            return () => {
                value |= 0;
                value = (value + 0x6d2b79f5) | 0;
                let result = Math.imul(value ^ (value >>> 15), 1 | value);
                result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
                return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
            };
        })(9917);

        for (let index = 0; index < 720; index += 1) {
            const theta = random() * Math.PI * 2;
            const elevation = Math.asin(random() * 0.95 + 0.05);
            const radius = 780;
            positions.push(
                Math.cos(theta) * Math.cos(elevation) * radius,
                Math.sin(elevation) * radius,
                Math.sin(theta) * Math.cos(elevation) * radius,
            );
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 2.2,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            fog: false,
        });

        return { points: new THREE.Points(geometry, material), material };
    }

    private buildWorld(): void {
        const grass = noiseTexture('#77a94f', ['#6f9e48', '#82b35a', '#6a9845', '#8cbc62', '#5f8e3e']);
        grass.repeat.set(58, 58);

        const soil = noiseTexture('#735941', ['#66503b', '#7d6146', '#5d4836', '#866a4d'], 3200);
        soil.repeat.set(9, 9);

        const gravel = noiseTexture('#a2937f', ['#938572', '#ab9c87', '#887a68', '#b6a892'], 3600);
        gravel.repeat.set(18, 18);

        const road = noiseTexture('#a88962', ['#9a7c58', '#b5966d', '#8d7050', '#c0a077'], 3600);
        road.repeat.set(3, 22);

        this.buildTerrain(grass);
        this.buildRoads(road);
        this.buildYard(gravel);
        this.buildPond();
        this.buildPlots(soil);
        this.buildWaterSources();
        this.buildIrrigationLines();
        this.buildFarmBuildings();
        this.buildPasture();
        this.buildTractor();
        this.buildFarmer();
        this.buildTrees();
        this.buildRocks();
        this.buildFences();

        this.updateMinimap(true);
    }

    private buildTerrain(grassTexture: THREE.CanvasTexture): void {
        const resolution = 120;
        const geometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, resolution, resolution);
        geometry.rotateX(-Math.PI / 2);

        const positions = geometry.attributes.position;
        const colors = new Float32Array(positions.count * 3);
        const color = new THREE.Color();

        for (let index = 0; index < positions.count; index += 1) {
            const x = positions.getX(index);
            const z = positions.getZ(index);
            const y = heightAt(x, z);
            positions.setY(index, y);

            const variation =
                ((Math.sin(x * 1.7 + z * 2.3) * 43758.5453) % 1) * 0.18 +
                ((Math.sin(x * 8.1 + z * 6.7) * 24634.6345) % 1) * 0.06;
            color.setHSL(0.245 + variation * 0.04, 0.42 + variation * 0.2, 0.34 + variation * 0.12);
            colors[index * 3] = color.r;
            colors[index * 3 + 1] = color.g;
            colors[index * 3 + 2] = color.b;
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            map: grassTexture,
            vertexColors: true,
            roughness: 0.98,
            metalness: 0,
        });

        const ground = new THREE.Mesh(geometry, material);
        ground.receiveShadow = true;
        ground.name = 'terrain';
        this.scene.add(ground);
    }

    private buildRoads(texture: THREE.CanvasTexture): void {
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            color: 0xd8c7aa,
            roughness: 1,
            metalness: 0,
        });

        this.scene.add(
            ribbon(
                [
                    { x: 0, z: 178 },
                    { x: 0, z: 148 },
                    { x: 1, z: 116 },
                    { x: 2, z: 84 },
                    { x: 1, z: 58 },
                    { x: 0, z: 38 },
                ],
                9,
                material,
            ),
        );

        this.scene.add(
            ribbon(
                [
                    { x: 0, z: 38 },
                    { x: 22, z: 35 },
                    { x: 42, z: 39 },
                    { x: 55, z: 43 },
                ],
                5.5,
                material,
            ),
        );

        this.scene.add(
            ribbon(
                [
                    { x: 0, z: 38 },
                    { x: -28, z: 32 },
                    { x: -54, z: 18 },
                ],
                4.5,
                material,
            ),
        );
    }

    private buildYard(texture: THREE.CanvasTexture): void {
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            color: 0xe0d5c4,
            roughness: 1,
            metalness: 0,
        });
        const geometry = new THREE.CircleGeometry(YARD.radius, 56);
        geometry.rotateX(-Math.PI / 2);

        const yard = new THREE.Mesh(geometry, material);
        yard.position.set(YARD.x, heightAt(YARD.x, YARD.z) + 0.16, YARD.z);
        yard.receiveShadow = true;
        this.scene.add(yard);

        const inner = new THREE.Mesh(
            new THREE.CircleGeometry(YARD.radius * 0.66, 48),
            new THREE.MeshStandardMaterial({ color: 0xb9aa96, roughness: 1 }),
        );
        inner.rotation.x = -Math.PI / 2;
        inner.position.set(YARD.x, heightAt(YARD.x, YARD.z) + 0.18, YARD.z);
        inner.receiveShadow = true;
        this.scene.add(inner);
    }

    private buildPond(): void {
        const baseY = heightAt(POND.x, POND.z);
        this.pondBaseY = baseY;

        const shore = new THREE.Mesh(
            new THREE.CircleGeometry(POND.radius + 3.2, 48),
            new THREE.MeshStandardMaterial({ color: 0xb9a987, roughness: 1 }),
        );
        shore.rotation.x = -Math.PI / 2;
        shore.position.set(POND.x, baseY + 0.08, POND.z);
        shore.receiveShadow = true;
        this.scene.add(shore);

        const water = new THREE.Mesh(
            new THREE.CircleGeometry(POND.radius, 48),
            new THREE.MeshStandardMaterial({
                color: 0x3e9dc4,
                roughness: 0.18,
                metalness: 0.12,
                transparent: true,
                opacity: 0.9,
            }),
        );
        water.rotation.x = -Math.PI / 2;
        water.position.set(POND.x, baseY + 0.16, POND.z);
        water.receiveShadow = true;
        this.pondWater = water;
        this.scene.add(water);

        const random = (surpriseSeed => {
            let value = surpriseSeed;
            return () => {
                value |= 0;
                value = (value + 0x6d2b79f5) | 0;
                let result = Math.imul(value ^ (value >>> 15), 1 | value);
                result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
                return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
            };
        })(771);

        const lilyMaterial = new THREE.MeshStandardMaterial({ color: 0x4f8f43, roughness: 0.9 });

        for (let index = 0; index < 14; index += 1) {
            const pad = new THREE.Mesh(new THREE.CircleGeometry(0.5 + random() * 0.8, 7), lilyMaterial);
            pad.rotation.x = -Math.PI / 2;
            const angle = random() * Math.PI * 2;
            const radius = 2 + random() * (POND.radius - 4);
            pad.position.set(
                POND.x + Math.cos(angle) * radius,
                baseY + 0.2,
                POND.z + Math.sin(angle) * radius,
            );
            this.scene.add(pad);
        }

        const reedMaterial = new THREE.MeshStandardMaterial({ color: 0x6d8f3c, roughness: 1 });

        for (let index = 0; index < 34; index += 1) {
            const angle = random() * Math.PI * 2;
            const radius = POND.radius + 0.8 + random() * 2;
            const reed = new THREE.Mesh(new THREE.ConeGeometry(0.18, 2.1 + random() * 1.5, 4), reedMaterial);
            reed.position.set(
                POND.x + Math.cos(angle) * radius,
                heightAt(POND.x + Math.cos(angle) * radius, POND.z + Math.sin(angle) * radius) + 1,
                POND.z + Math.sin(angle) * radius,
            );
            this.scene.add(reed);
        }
    }

    private campaignForPlot(plotId: string): ResourceRow | null {
        const campaigns = this.options.campaigns;

        if (!campaigns?.length) return null;

        const rank = (status: string): number =>
            status === 'active'
                ? 0
                : status === 'planifiee'
                  ? 1
                  : status === 'suspendue'
                    ? 2
                    : status === 'terminee'
                      ? 3
                      : 4;
        const candidates = campaigns
            .filter((campaign) => String(campaign.plot_id) === plotId && String(campaign.status) !== 'annulee')
            .sort((a, b) => rank(String(a.status)) - rank(String(b.status)));

        return candidates[0] ?? null;
    }

    private cropForCampaign(campaign: ResourceRow | null): ResourceRow | null {
        if (!campaign) return null;

        const crop = campaign.crop;

        return crop !== null && typeof crop === 'object' ? (crop as ResourceRow) : null;
    }

    private buildPlots(soil: THREE.CanvasTexture): void {
        const slots = plotSlots();
        let random = 0;

        this.options.rows.forEach((row, index) => {
            const slot = slots[index % slots.length];
            const statusKey = String(row.status ?? 'disponible');
            const status = STATUS[statusKey] ?? STATUS.disponible;
            const id = String(row.id);
            const campaign = this.campaignForPlot(id);
            const crop = this.cropForCampaign(campaign);
            const palette = crop ? cropPalette(crop) : null;
            const baseY = rectMaxHeight(slot.x, slot.z, slot.width, slot.depth) + 0.3;
            const group = new THREE.Group();
            group.position.set(slot.x, baseY, slot.z);
            this.scene.add(group);
            random = (index + 1) * 7919 + slot.x * 13 + slot.z * 17;

            const foundation = new THREE.Mesh(
                new THREE.BoxGeometry(slot.width + 1.6, 1.2, slot.depth + 1.6),
                new THREE.MeshStandardMaterial({ color: 0x5d4936, roughness: 1 }),
            );
            foundation.position.y = -0.62;
            foundation.receiveShadow = true;
            group.add(foundation);

            const surface = new THREE.Mesh(
                new THREE.PlaneGeometry(slot.width, slot.depth),
                new THREE.MeshStandardMaterial({
                    map: soil,
                    color: statusKey === 'en_repos' ? 0xb49a63 : 0x9a7d5e,
                    roughness: 1,
                    metalness: 0,
                }),
            );
            surface.rotation.x = -Math.PI / 2;
            surface.position.y = 0.02;
            surface.receiveShadow = true;
            group.add(surface);

            const [cropA, cropB] = palette ? [palette.base, palette.light] : (CROP_COLORS[statusKey] ?? CROP_COLORS.disponible);
            const cropHeight = palette ? palette.height : statusKey === 'en_culture' ? 1.35 : statusKey === 'en_repos' ? 0.55 : 0.35;
            const density = palette ? 0.86 : statusKey === 'indisponible' ? 0.35 : statusKey === 'disponible' ? 0.55 : 0.82;
            const spacingX = palette || statusKey === 'en_culture' ? 1.15 : 1.55;
            const spacingZ = palette || statusKey === 'en_culture' ? 1.35 : 1.8;
            const columns = Math.max(2, Math.floor((slot.width - 4) / spacingX));
            const lines = Math.max(2, Math.floor((slot.depth - 4) / spacingZ));
            const capacity = columns * lines;
            const count = Math.max(1, Math.floor(capacity * density));

            const cropGeometry = new THREE.ConeGeometry(0.3, 1, 4);
            cropGeometry.translate(0, 0.5, 0);
            const cropMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color(cropA),
                roughness: 0.9,
                metalness: 0,
            });
            const crops = new THREE.InstancedMesh(cropGeometry, cropMaterial, count);
            crops.castShadow = false;
            crops.receiveShadow = false;

            const matrix = new THREE.Matrix4();
            const position = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            const color = new THREE.Color();
            const localRandom = (seed => {
                let value = seed;
                return () => {
                    value |= 0;
                    value = (value + 0x6d2b79f5) | 0;
                    let result = Math.imul(value ^ (value >>> 15), 1 | value);
                    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
                    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
                };
            })(random);
            let placed = 0;

            for (let line = 0; line < lines && placed < count; line += 1) {
                for (let column = 0; column < columns && placed < count; column += 1) {
                    if (localRandom() > density) continue;

                    const x = -slot.width / 2 + 2 + (column + 0.5) * ((slot.width - 4) / columns);
                    const z = -slot.depth / 2 + 2 + (line + 0.5) * ((slot.depth - 4) / lines);
                    const variation = 0.75 + localRandom() * 0.35;

                    position.set(x, 0.02, z);
                    quaternion.setFromEuler(new THREE.Euler(0, localRandom() * Math.PI, 0));
                    scale.set(0.8 + localRandom() * 0.5, cropHeight * variation, 0.8 + localRandom() * 0.5);
                    matrix.compose(position, quaternion, scale);
                    crops.setMatrixAt(placed, matrix);

                    color.setHex(cropA).lerp(new THREE.Color(cropB), localRandom());
                    crops.setColorAt(placed, color);
                    placed += 1;
                }
            }

            crops.count = placed;
            crops.instanceMatrix.needsUpdate = true;
            if (crops.instanceColor) crops.instanceColor.needsUpdate = true;
            group.add(crops);

            const borderMaterial = new THREE.MeshStandardMaterial({
                color: palette?.base ?? status.color,
                roughness: 0.85,
                metalness: 0,
            });
            const horizontal = new THREE.BoxGeometry(slot.width + 1.6, 0.36, 0.34);
            const vertical = new THREE.BoxGeometry(0.34, 0.36, slot.depth + 1.6);

            for (const side of [-1, 1]) {
                const front = new THREE.Mesh(horizontal, borderMaterial);
                front.position.set(0, 0.16, side * (slot.depth / 2 + 0.8));
                group.add(front);

                const edge = new THREE.Mesh(vertical, borderMaterial);
                edge.position.set(side * (slot.width / 2 + 0.8), 0.16, 0);
                group.add(edge);
            }

            const highlight = new THREE.Mesh(
                new THREE.PlaneGeometry(slot.width + 4, slot.depth + 4),
                new THREE.MeshBasicMaterial({
                    color: palette?.base ?? status.color,
                    transparent: true,
                    opacity: 0.2,
                    depthWrite: false,
                    side: THREE.DoubleSide,
                }),
            );
            highlight.rotation.x = -Math.PI / 2;
            highlight.position.y = 0.24;
            highlight.renderOrder = 3;
            highlight.visible = false;
            group.add(highlight);

            const sign = new THREE.Sprite(
                new THREE.SpriteMaterial({
                    map: labelTexture(
                        String(row.code ?? `P-${index + 1}`),
                        crop
                            ? `${String(crop.name ?? 'Culture')} · ${campaignStatusLabel(String(campaign?.status ?? 'active'))}`
                            : `${String(row.name ?? 'Parcelle')} · ${status.label}`,
                        palette?.css ?? status.css,
                    ),
                    transparent: true,
                    depthTest: true,
                    depthWrite: false,
                }),
            );
            sign.scale.set(12, 3.9, 1);
            sign.position.set(0, 3.7, slot.depth / 2 + 2.2);
            group.add(sign);

            const pick = new THREE.Mesh(
                new THREE.PlaneGeometry(slot.width + 1.6, slot.depth + 1.6),
                new THREE.MeshBasicMaterial({
                    transparent: true,
                    opacity: 0,
                    depthWrite: false,
                    side: THREE.DoubleSide,
                }),
            );
            pick.rotation.x = -Math.PI / 2;
            pick.position.y = 0.35;
            pick.userData.entity = { kind: 'plot', id };
            group.add(pick);
            this.pickables.push(pick);

            const marker: PlotMarker = {
                id,
                row,
                group,
                pick,
                highlight,
                position: new THREE.Vector3(slot.x, baseY, slot.z),
                width: slot.width,
                depth: slot.depth,
                status,
                crop: crop ?? undefined,
                campaign: campaign ?? undefined,
            };
            this.plots.push(marker);
            pick.userData.marker = marker;
        });
    }

    private buildWaterSources(): void {
        const sources = this.options.waterSources;
        let random = 4231;

        sources.forEach((row, index) => {
            const count = Math.max(sources.length, 1);
            const angle = (index / count) * Math.PI * 2 + 0.3;
            const radius = 23 + (index % 2) * 7;
            const x = POND.x + Math.cos(angle) * radius;
            const z = POND.z + Math.sin(angle) * radius;
            const id = String(row.id);
            const baseY = heightAt(x, z);
            random = (index + 1) * 3571;

            const group = new THREE.Group();
            group.position.set(x, baseY, z);
            group.rotation.y = random * 0.001;
            this.scene.add(group);

            const tankMaterial = new THREE.MeshStandardMaterial({
                color: 0x3a9dcc,
                roughness: 0.35,
                metalness: 0.45,
            });
            const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 4.4, 16), tankMaterial);
            tank.position.y = 3.1;
            tank.castShadow = true;
            tank.receiveShadow = true;
            tank.userData.entity = { kind: 'water', id };
            group.add(tank);
            this.pickables.push(tank);

            const roof = new THREE.Mesh(
                new THREE.ConeGeometry(2.7, 1.1, 16),
                new THREE.MeshStandardMaterial({ color: 0x24485c, roughness: 0.6, metalness: 0.5 }),
            );
            roof.position.y = 5.85;
            roof.castShadow = true;
            group.add(roof);

            const bandMaterial = new THREE.MeshStandardMaterial({
                color: 0xd7e8f0,
                roughness: 0.4,
                metalness: 0.7,
            });

            for (const y of [1.5, 3.1, 4.7]) {
                const band = new THREE.Mesh(new THREE.TorusGeometry(2.53, 0.07, 5, 20), bandMaterial);
                band.rotation.x = Math.PI / 2;
                band.position.y = y;
                group.add(band);
            }

            const legMaterial = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.7, metalness: 0.4 });

            for (const angleOffset of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
                const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.1, 0.22), legMaterial);
                leg.position.set(Math.cos(angleOffset) * 1.8, 0.45, Math.sin(angleOffset) * 1.8);
                group.add(leg);
            }

            const puddle = new THREE.Mesh(
                new THREE.CircleGeometry(3.3, 24),
                new THREE.MeshStandardMaterial({
                    color: 0x2c7fa8,
                    roughness: 0.2,
                    metalness: 0.1,
                    transparent: true,
                    opacity: 0.75,
                }),
            );
            puddle.rotation.x = -Math.PI / 2;
            puddle.position.y = 0.06;
            group.add(puddle);

            const sign = new THREE.Sprite(
                new THREE.SpriteMaterial({
                    map: labelTexture(
                        String(row.name ?? `Eau ${index + 1}`).slice(0, 18),
                        `${Number(row.available_quantity ?? 0)} ${String(row.unit ?? '')}`.trim(),
                        '#3aa6d8',
                    ),
                    transparent: true,
                    depthTest: true,
                    depthWrite: false,
                }),
            );
            sign.scale.set(10, 3.3, 1);
            sign.position.set(0, 7.3, 0);
            group.add(sign);

            const highlight = new THREE.Mesh(
                new THREE.RingGeometry(3.4, 4.2, 28),
                new THREE.MeshBasicMaterial({
                    color: 0x53c8f4,
                    transparent: true,
                    opacity: 0.8,
                    side: THREE.DoubleSide,
                    depthWrite: false,
                }),
            );
            highlight.rotation.x = -Math.PI / 2;
            highlight.position.y = 0.14;
            highlight.visible = false;
            group.add(highlight);

            const marker: WaterMarker = {
                id,
                row,
                group,
                pick: tank,
                highlight,
                position: new THREE.Vector3(x, baseY, z),
            };
            tank.userData.marker = marker;
            this.water.push(marker);
        });
    }

    private buildIrrigationLines(): void {
        if (!this.options.irrigations?.length) return;

        const plots = new Map(this.plots.map((plot) => [plot.id, plot]));
        const sources = new Map(this.water.map((source) => [source.id, source]));
        const material = new THREE.LineDashedMaterial({
            color: 0x67d4ff,
            transparent: true,
            opacity: 0.65,
            dashSize: 2.2,
            gapSize: 1.6,
            depthWrite: false,
        });

        for (const row of this.options.irrigations) {
            const plot = plots.get(String(row.plot_id));
            const source = sources.get(String(row.water_source_id));
            if (!plot || !source) continue;

            const geometry = new THREE.BufferGeometry().setFromPoints(
                this.irrigationCurve(source.position, plot.position),
            );
            const line = new THREE.Line(geometry, material);
            line.computeLineDistances();
            line.renderOrder = 2;
            this.scene.add(line);
        }
    }

    private irrigationCurve(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
        const points: THREE.Vector3[] = [];
        const segments = 18;

        for (let index = 0; index <= segments; index += 1) {
            const t = index / segments;
            const x = THREE.MathUtils.lerp(from.x, to.x, t);
            const z = THREE.MathUtils.lerp(from.z, to.z, t);
            const arc = Math.sin(t * Math.PI) * 3.5;
            points.push(new THREE.Vector3(x, heightAt(x, z) + 0.4 + arc, z));
        }

        return points;
    }

    private buildFarmBuildings(): void {
        this.scene.add(createHouse(-24, -30, 17, 11, 5.4, 0.18, this.nightLights));
        this.scene.add(createBarn(25, -31, 22, 16, 7.2, -0.06));
        this.scene.add(createSilo(47, -11, 3.4, 15, 0));
        this.scene.add(createSilo(53, -5, 2.9, 12, 0.4));
        this.scene.add(createSilo(44, -3, 2.6, 11, -0.2));
        const windmill = createWindmill(-47, 14);
        this.windmillBlades = windmill.blades;
        this.scene.add(windmill.group);
        this.scene.add(createHayBales(35, 17));
        this.scene.add(createWell(12, -3));
    }

    private buildPasture(): void {
        const group = new THREE.Group();
        group.position.set(PASTURE.x, heightAt(PASTURE.x, PASTURE.z) + 0.12, PASTURE.z);
        this.scene.add(group);

        const grass = new THREE.Mesh(
            new THREE.PlaneGeometry(PASTURE.width, PASTURE.depth),
            new THREE.MeshStandardMaterial({ color: 0x7fae53, roughness: 1 }),
        );
        grass.rotation.x = -Math.PI / 2;
        grass.receiveShadow = true;
        group.add(grass);

        const positions = [
            [-9, -7],
            [6, -8],
            [10, 4],
            [-5, 7],
            [-12, 3],
        ];

        positions.forEach(([px, pz], index) => {
            const cow = createCow();
            cow.position.set(px, 0, pz);
            cow.rotation.y = index * 1.7;
            group.add(cow);
        });
    }

    private buildTractor(): void {
        const tractor = createTractor(this.nightMaterials);
        this.tractor = tractor.group;
        this.tractorWheels = tractor.wheels;
        this.tractor.position.copy(this.tractorPosition);
        this.tractor.position.y = heightAt(this.tractorPosition.x, this.tractorPosition.z);
        this.tractor.rotation.y = this.tractorHeading;
        this.scene.add(this.tractor);
    }

    private buildFarmer(): void {
        const farmer = createFarmer();
        this.player = farmer.group;
        this.playerLegs = farmer.legs;
        this.playerArms = farmer.arms;
        this.player.position.copy(this.playerPosition);
        this.player.position.y = heightAt(this.playerPosition.x, this.playerPosition.z);
        this.scene.add(this.player);
    }

    private buildTrees(): void {
        const random = (seed => {
            let value = seed;
            return () => {
                value |= 0;
                value = (value + 0x6d2b79f5) | 0;
                let result = Math.imul(value ^ (value >>> 15), 1 | value);
                result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
                return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
            };
        })(171717);
        const spots: Array<{ x: number; z: number; scale: number; pine: boolean }> = [];
        let attempts = 0;

        while (spots.length < 190 && attempts < 2400) {
            attempts += 1;
            const x = -165 + random() * 330;
            const z = -165 + random() * 330;

            if (Math.hypot(x - YARD.x, z - YARD.z) < YARD.radius + 10) continue;
            if (Math.hypot(x - POND.x, z - POND.z) < POND.radius + 8) continue;
            if (Math.abs(x - PASTURE.x) < PASTURE.width / 2 + 5 && Math.abs(z - PASTURE.z) < PASTURE.depth / 2 + 5) continue;
            if (Math.abs(x) < 12 && z > 30 && z < 180) continue;
            if (Math.abs(x) < 12 && z < -25) continue;

            let blocked = false;

            for (const source of this.water) {
                if (Math.hypot(x - source.position.x, z - source.position.z) < 7) {
                    blocked = true;
                    break;
                }
            }

            for (const plot of this.plots) {
                if (
                    Math.abs(x - plot.position.x) < plot.width / 2 + 5 &&
                    Math.abs(z - plot.position.z) < plot.depth / 2 + 5
                ) {
                    blocked = true;
                    break;
                }
            }

            if (blocked) continue;

            spots.push({ x, z, scale: 0.65 + random() * 0.95, pine: random() > 0.48 });
        }

        const trunkGeometry = new THREE.CylinderGeometry(0.36, 0.62, 3.2, 6);
        trunkGeometry.translate(0, 1.6, 0);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x74513a, roughness: 1 });
        const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, spots.length);
        trunks.castShadow = true;
        trunks.receiveShadow = true;

        const pineSpots = spots.filter((spot) => spot.pine);
        const roundSpots = spots.filter((spot) => !spot.pine);
        const pineGeometry = new THREE.ConeGeometry(2.7, 8, 7);
        pineGeometry.translate(0, 7, 0);
        const pineMaterial = new THREE.MeshStandardMaterial({ color: 0x3f7a3f, roughness: 0.95, flatShading: true });
        const pines = new THREE.InstancedMesh(pineGeometry, pineMaterial, Math.max(pineSpots.length, 1));
        pines.castShadow = true;

        const roundGeometry = new THREE.IcosahedronGeometry(2.9, 0);
        roundGeometry.translate(0, 6.7, 0);
        const roundMaterial = new THREE.MeshStandardMaterial({ color: 0x5b9a48, roughness: 0.95, flatShading: true });
        const rounds = new THREE.InstancedMesh(roundGeometry, roundMaterial, Math.max(roundSpots.length, 1));
        rounds.castShadow = true;

        const matrix = new THREE.Matrix4();
        const quaternion = new THREE.Quaternion();
        const position = new THREE.Vector3();
        const scale = new THREE.Vector3();
        const color = new THREE.Color();

        spots.forEach((spot, index) => {
            position.set(spot.x, heightAt(spot.x, spot.z), spot.z);
            quaternion.setFromEuler(new THREE.Euler(0, random() * Math.PI * 2, 0));
            scale.setScalar(spot.scale);
            matrix.compose(position, quaternion, scale);
            trunks.setMatrixAt(index, matrix);
            color.setHSL(0.08, 0.28 + random() * 0.15, 0.27 + random() * 0.1);
            trunks.setColorAt(index, color);
        });

        pineSpots.forEach((spot, index) => {
            position.set(spot.x, heightAt(spot.x, spot.z), spot.z);
            quaternion.setFromEuler(new THREE.Euler(0, random() * Math.PI * 2, 0));
            scale.setScalar(spot.scale);
            matrix.compose(position, quaternion, scale);
            pines.setMatrixAt(index, matrix);
            color.setHSL(0.3 + random() * 0.03, 0.38 + random() * 0.12, 0.23 + random() * 0.09);
            pines.setColorAt(index, color);
        });

        roundSpots.forEach((spot, index) => {
            position.set(spot.x, heightAt(spot.x, spot.z), spot.z);
            quaternion.setFromEuler(new THREE.Euler(0, random() * Math.PI * 2, 0));
            scale.set(spot.scale * (0.9 + random() * 0.2), spot.scale, spot.scale * (0.9 + random() * 0.2));
            matrix.compose(position, quaternion, scale);
            rounds.setMatrixAt(index, matrix);
            color.setHSL(0.24 + random() * 0.07, 0.42 + random() * 0.16, 0.3 + random() * 0.12);
            rounds.setColorAt(index, color);
        });

        for (const mesh of [trunks, pines, rounds]) {
            mesh.instanceMatrix.needsUpdate = true;
            if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
            this.scene.add(mesh);
        }

        const tuftGeometry = new THREE.ConeGeometry(0.32, 0.9, 4);
        tuftGeometry.translate(0, 0.45, 0);
        const tuftMaterial = new THREE.MeshStandardMaterial({ color: 0x77a94b, roughness: 1 });
        const tufts = new THREE.InstancedMesh(tuftGeometry, tuftMaterial, 620);
        let tuftCount = 0;

        for (let index = 0; index < 1400 && tuftCount < 620; index += 1) {
            const x = -168 + random() * 336;
            const z = -168 + random() * 336;

            if (Math.hypot(x - YARD.x, z - YARD.z) < YARD.radius + 2) continue;
            if (Math.hypot(x - POND.x, z - POND.z) < POND.radius + 2) continue;
            if (Math.abs(x) < 8 && z > 30) continue;

            let blocked = false;
            for (const plot of this.plots) {
                if (
                    Math.abs(x - plot.position.x) < plot.width / 2 + 1 &&
                    Math.abs(z - plot.position.z) < plot.depth / 2 + 1
                ) {
                    blocked = true;
                    break;
                }
            }
            if (blocked) continue;

            position.set(x, heightAt(x, z), z);
            quaternion.setFromEuler(new THREE.Euler(0, random() * Math.PI, 0));
            scale.set(0.7 + random() * 0.7, 0.6 + random() * 0.9, 0.7 + random() * 0.7);
            matrix.compose(position, quaternion, scale);
            tufts.setMatrixAt(tuftCount, matrix);
            color.setHSL(0.25 + random() * 0.04, 0.45 + random() * 0.2, 0.32 + random() * 0.1);
            tufts.setColorAt(tuftCount, color);
            tuftCount += 1;
        }

        tufts.count = tuftCount;
        tufts.instanceMatrix.needsUpdate = true;
        if (tufts.instanceColor) tufts.instanceColor.needsUpdate = true;
        this.scene.add(tufts);
    }

    private buildRocks(): void {
        const random = (seed => {
            let value = seed;
            return () => {
                value |= 0;
                value = (value + 0x6d2b79f5) | 0;
                let result = Math.imul(value ^ (value >>> 15), 1 | value);
                result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
                return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
            };
        })(6161);
        const geometry = new THREE.DodecahedronGeometry(1.1, 0);
        const material = new THREE.MeshStandardMaterial({ color: 0x8d8a7f, roughness: 1, flatShading: true });
        const rocks = new THREE.InstancedMesh(geometry, material, 34);
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        const color = new THREE.Color();

        for (let index = 0; index < 34; index += 1) {
            const x = -150 + random() * 300;
            const z = -150 + random() * 300;
            const size = 0.4 + random() * 1.2;
            position.set(x, heightAt(x, z) + size * 0.3, z);
            quaternion.setFromEuler(new THREE.Euler(random(), random() * Math.PI, random()));
            scale.set(size * (0.8 + random() * 0.5), size * 0.7, size * (0.8 + random() * 0.5));
            matrix.compose(position, quaternion, scale);
            rocks.setMatrixAt(index, matrix);
            color.setHSL(0.12, 0.06, 0.4 + random() * 0.16);
            rocks.setColorAt(index, color);
        }

        rocks.castShadow = true;
        rocks.receiveShadow = true;
        rocks.instanceMatrix.needsUpdate = true;
        if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
        this.scene.add(rocks);
    }

    private buildFences(): void {
        const wood = new THREE.MeshStandardMaterial({ color: 0x9a7352, roughness: 0.95 });
        const postGeometry = new THREE.BoxGeometry(0.36, 2.2, 0.36);
        const railGeometry = new THREE.BoxGeometry(3.8, 0.18, 0.16);

        const addFence = (points: Array<{ x: number; z: number }>) => {
            for (let index = 0; index < points.length - 1; index += 1) {
                const a = points[index];
                const b = points[index + 1];
                const distance = Math.hypot(b.x - a.x, b.z - a.z);
                const steps = Math.max(1, Math.round(distance / 4.2));

                for (let step = 0; step <= steps; step += 1) {
                    const t = step / steps;
                    const x = THREE.MathUtils.lerp(a.x, b.x, t);
                    const z = THREE.MathUtils.lerp(a.z, b.z, t);
                    const post = new THREE.Mesh(postGeometry, wood);
                    post.position.set(x, heightAt(x, z) + 1.1, z);
                    post.castShadow = true;
                    this.scene.add(post);
                }

                for (const heightOffset of [0.8, 1.55]) {
                    const rail = new THREE.Mesh(railGeometry, wood);
                    const midX = (a.x + b.x) / 2;
                    const midZ = (a.z + b.z) / 2;
                    rail.position.set(midX, heightAt(midX, midZ) + heightOffset, midZ);
                    rail.rotation.y = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
                    rail.scale.x = distance / 3.8;
                    rail.castShadow = true;
                    this.scene.add(rail);
                }
            }
        };

        addFence([
            { x: -47, z: 38 },
            { x: -8, z: 38 },
        ]);
        addFence([
            { x: 8, z: 38 },
            { x: 47, z: 38 },
        ]);
        addFence([
            { x: -47, z: 38 },
            { x: -47, z: -36 },
        ]);
        addFence([
            { x: 47, z: 38 },
            { x: 47, z: -36 },
        ]);

        const x0 = PASTURE.x - PASTURE.width / 2;
        const x1 = PASTURE.x + PASTURE.width / 2;
        const z0 = PASTURE.z - PASTURE.depth / 2;
        const z1 = PASTURE.z + PASTURE.depth / 2;
        addFence([
            { x: x0, z: z0 },
            { x: x1, z: z0 },
            { x: x1, z: z1 },
            { x: x0, z: z1 },
            { x: x0, z: z0 },
        ]);
    }

    // ------------------------------------------------------------------
    // Cycle jour/nuit
    // ------------------------------------------------------------------

    private updateDaylight(): void {
        const angle = ((this.hour - 6) / 12) * Math.PI;
        const elevation = Math.sin(angle);
        const day = smoothstep(-0.08, 0.36, elevation);
        const night = 1 - day;
        const twilight = Math.exp(-Math.abs(elevation) * 4.4) * (1 - smoothstep(0.78, 0.98, day));

        this.skyDirection.set(Math.cos(angle) * 0.82, elevation, 0.46).normalize();

        this.sun.position.copy(this.skyDirection).multiplyScalar(190);
        this.sun.target.position.set(0, 0, 0);
        this.sun.intensity = Math.max(0, elevation) * 3.4 + 0.15;
        this.sun.color.setHSL(0.11, 0.32 + twilight * 0.35, 0.9 - twilight * 0.12);

        this.moon.position.copy(this.skyDirection).multiplyScalar(-180);
        this.moon.intensity = night * 0.34;

        this.hemi.intensity = 0.28 + day * 0.85;
        this.hemi.color.setHSL(0.56, 0.42, 0.72 - night * 0.28);

        const dayTop = new THREE.Color(0x4b9fd8);
        const dayBottom = new THREE.Color(0xd8edf8);
        const nightTop = new THREE.Color(0x040817);
        const nightBottom = new THREE.Color(0x15233f);
        const duskTop = new THREE.Color(0x3d4f87);
        const duskBottom = new THREE.Color(0xf3a46b);

        const top = nightTop.clone().lerp(dayTop, day).lerp(duskTop, twilight * 0.55);
        const bottom = nightBottom.clone().lerp(dayBottom, day).lerp(duskBottom, twilight * 0.8);

        this.skyUniforms.topColor.value.copy(top);
        this.skyUniforms.bottomColor.value.copy(bottom);

        if (this.scene.fog instanceof THREE.Fog) {
            this.scene.fog.color.copy(bottom);
        }

        this.starsMaterial.opacity = night * 0.9;
        this.stars.visible = night > 0.05;

        const material = this.sunDisc.material as THREE.SpriteMaterial;
        material.color.setHSL(0.1, 0.55, 0.9);
        material.opacity = smoothstep(-0.12, 0.08, elevation);
        this.sunDisc.visible = elevation > -0.15;

        for (const nightLight of this.nightLights) {
            nightLight.emissiveIntensity = night * 0.95;
        }

        for (const nightMaterial of this.nightMaterials) {
            nightMaterial.emissiveIntensity = 0.15 + night * 1.1;
        }
    }

    // ------------------------------------------------------------------
    // Événements et sélection
    // ------------------------------------------------------------------

    private bindEvents(): void {
        const canvas = this.options.canvas;

        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            if (target && (/input|textarea|select/i.test(target.tagName) || target.isContentEditable)) return;
            if (event.metaKey || event.ctrlKey || event.altKey) return;

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
                event.preventDefault();
            }

            this.keys.add(event.code);
        };

        const onKeyUp = (event: KeyboardEvent) => this.keys.delete(event.code);
        const onBlur = () => this.keys.clear();

        const onPointerDown = (event: PointerEvent) => {
            this.pointer = { down: true, x: event.clientX, y: event.clientY, moved: 0 };
            if (this.mode !== 'orbit') {
                try {
                    canvas.setPointerCapture(event.pointerId);
                } catch {
                    // Les événements synthétiques n'ont pas de pointeur actif.
                }
            }
        };

        const onPointerMove = (event: PointerEvent) => {
            if (this.pointer.down) {
                this.pointer.moved += Math.abs(event.clientX - this.pointer.x) + Math.abs(event.clientY - this.pointer.y);
                if (this.mode === 'walk') {
                    this.cameraYaw -= (event.clientX - this.pointer.x) * 0.005;
                    this.cameraPitch = clamp(this.cameraPitch + (event.clientY - this.pointer.y) * 0.003, 0.1, 1.15);
                }
                this.pointer.x = event.clientX;
                this.pointer.y = event.clientY;
                return;
            }

            this.updateHover(event);
        };

        const onPointerUp = (event: PointerEvent) => {
            const wasClick = this.pointer.moved < 6;
            this.pointer.down = false;

            try {
                if (canvas.hasPointerCapture(event.pointerId)) {
                    canvas.releasePointerCapture(event.pointerId);
                }
            } catch {
                // Ignore les pointeurs déjà relâchés.
            }

            if (wasClick) {
                this.selectAt(event);
            }
        };

        const onPointerLeave = () => {
            this.hovered = null;
            this.refreshHighlights();
            canvas.style.cursor = this.mode === 'orbit' ? 'grab' : 'default';
        };

        const onContextMenu = (event: Event) => event.preventDefault();

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', onBlur);
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointerleave', onPointerLeave);
        canvas.addEventListener('contextmenu', onContextMenu);

        this.listeners.push(
            () => window.removeEventListener('keydown', onKeyDown),
            () => window.removeEventListener('keyup', onKeyUp),
            () => window.removeEventListener('blur', onBlur),
            () => canvas.removeEventListener('pointerdown', onPointerDown),
            () => canvas.removeEventListener('pointermove', onPointerMove),
            () => canvas.removeEventListener('pointerup', onPointerUp),
            () => canvas.removeEventListener('pointerleave', onPointerLeave),
            () => canvas.removeEventListener('contextmenu', onContextMenu),
        );
    }

    private setRay(event: PointerEvent): void {
        const rect = this.options.canvas.getBoundingClientRect();
        this.pointerNdc.set(
            ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1,
            -((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1,
        );
        this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    }

    private markerAt(event: PointerEvent): PlotMarker | WaterMarker | null {
        this.setRay(event);
        const hits = this.raycaster.intersectObjects(this.pickables, false);
        const marker = hits[0]?.object.userData.marker as PlotMarker | WaterMarker | undefined;

        return marker ?? null;
    }

    private updateHover(event: PointerEvent): void {
        const marker = this.markerAt(event);
        this.hovered = marker;
        this.refreshHighlights();
        this.options.canvas.style.cursor = marker ? 'pointer' : this.mode === 'orbit' ? 'grab' : 'default';
    }

    private selectAt(event: PointerEvent): void {
        const marker = this.markerAt(event);
        this.selected = marker;
        this.refreshHighlights();

        if (!marker) {
            this.options.onSelect(null);
            return;
        }

        if ('status' in marker) {
            this.options.onSelect({
                kind: 'plot',
                row: marker.row,
                crop: marker.crop,
                campaign: marker.campaign,
            });
            return;
        }

        this.options.onSelect({ kind: 'water', row: marker.row });
    }

    private matchesCropFilter(marker: PlotMarker): boolean {
        return this.highlightCropId !== null && marker.crop !== undefined && String(marker.crop.id) === this.highlightCropId;
    }

    private refreshHighlights(): void {
        for (const plot of this.plots) {
            plot.highlight.visible = plot === this.selected || plot === this.hovered || this.matchesCropFilter(plot);
        }

        for (const source of this.water) {
            source.highlight.visible = source === this.selected || source === this.hovered;
        }
    }

    // ------------------------------------------------------------------
    // Modes de caméra et déplacement
    // ------------------------------------------------------------------

    public setMode(mode: 'orbit' | 'walk' | 'drive'): void {
        this.applyMode(mode);
    }

    private applyMode(mode: 'orbit' | 'walk' | 'drive'): void {
        const previous = this.mode;
        this.mode = mode;
        this.keys.clear();
        this.orbit.enabled = mode === 'orbit';

        if (mode === 'orbit') {
            this.player.visible = true;
            this.orbit.target.set(0, 4, 0);
            this.camera.position.set(88, 74, 112);
            this.orbit.update();
            this.options.canvas.style.cursor = 'grab';
            return;
        }

        if (mode === 'walk') {
            this.player.visible = true;
            this.cameraYaw = this.playerHeading + Math.PI;
            this.cameraPitch = 0.38;
            this.cameraDistance = 13;
            this.positionWalkCamera(true);
            this.options.canvas.style.cursor = 'default';
            return;
        }

        this.player.visible = false;
        this.tractorSpeed = 0;
        this.positionDriveCamera(true);
        this.options.canvas.style.cursor = 'default';
        if (previous === 'orbit') {
            this.cameraYaw = this.tractorHeading + Math.PI;
        }
    }

    private positionWalkCamera(instant = false): void {
        const target = new THREE.Vector3(
            this.playerPosition.x,
            heightAt(this.playerPosition.x, this.playerPosition.z) + 2.4,
            this.playerPosition.z,
        );
        const horizontal = Math.cos(this.cameraPitch) * this.cameraDistance;
        const desired = new THREE.Vector3(
            target.x + Math.sin(this.cameraYaw) * horizontal,
            target.y + Math.sin(this.cameraPitch) * this.cameraDistance,
            target.z + Math.cos(this.cameraYaw) * horizontal,
        );

        if (instant) {
            this.camera.position.copy(desired);
        } else {
            this.camera.position.lerp(desired, 0.18);
        }

        this.camera.lookAt(target);
    }

    private positionDriveCamera(instant = false): void {
        const forward = new THREE.Vector3(Math.sin(this.tractorHeading), 0, Math.cos(this.tractorHeading));
        const target = new THREE.Vector3(
            this.tractorPosition.x,
            heightAt(this.tractorPosition.x, this.tractorPosition.z) + 3,
            this.tractorPosition.z,
        );
        const desired = target.clone().addScaledVector(forward, -17);
        desired.y += 6.5;

        if (instant) {
            this.camera.position.copy(desired);
        } else {
            this.camera.position.lerp(desired, 0.14);
        }

        this.camera.lookAt(target);
    }

    private updateWalk(dt: number): void {
        const forwardInput =
            (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
            (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
        const sideInput =
            (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
            (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
        const moving = forwardInput !== 0 || sideInput !== 0;

        if (moving) {
            const forward = new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
            const right = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw));
            const direction = forward.multiplyScalar(forwardInput).add(right.multiplyScalar(sideInput)).normalize();
            const sprinting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
            const speed = sprinting ? 14 : 8;

            this.playerPosition.x = clamp(this.playerPosition.x + direction.x * speed * dt, -162, 162);
            this.playerPosition.z = clamp(this.playerPosition.z + direction.z * speed * dt, -162, 162);
            this.playerHeading = Math.atan2(direction.x, direction.z);
            this.player.rotation.y = this.playerHeading;
            this.walkPhase += dt * (sprinting ? 11 : 7);
            const swing = Math.sin(this.walkPhase) * 0.55;
            this.playerLegs[0].rotation.x = swing;
            this.playerLegs[1].rotation.x = -swing;
            this.playerArms[0].rotation.x = -swing * 0.7;
            this.playerArms[1].rotation.x = swing * 0.7;
        } else {
            for (const leg of this.playerLegs) leg.rotation.x *= 0.82;
            for (const arm of this.playerArms) arm.rotation.x *= 0.82;
        }

        this.player.position.set(
            this.playerPosition.x,
            heightAt(this.playerPosition.x, this.playerPosition.z),
            this.playerPosition.z,
        );
        this.positionWalkCamera();
    }

    private updateDrive(dt: number): void {
        const throttle =
            (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
            (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
        const steer =
            (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
            (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
        const braking = this.keys.has('Space');

        const targetSpeed = braking ? 0 : throttle > 0 ? 16 : throttle < 0 ? -7 : 0;
        this.tractorSpeed += (targetSpeed - this.tractorSpeed) * Math.min(1, dt * (braking ? 7 : 2.2));

        if (Math.abs(this.tractorSpeed) > 0.02) {
            this.tractorHeading +=
                steer * dt * 1.25 * Math.sign(this.tractorSpeed) * clamp(Math.abs(this.tractorSpeed) / 5, 0, 1);
            const forward = new THREE.Vector3(Math.sin(this.tractorHeading), 0, Math.cos(this.tractorHeading));
            this.tractorPosition.x = clamp(this.tractorPosition.x + forward.x * this.tractorSpeed * dt, -160, 160);
            this.tractorPosition.z = clamp(this.tractorPosition.z + forward.z * this.tractorSpeed * dt, -160, 160);
        }

        this.tractor.position.set(
            this.tractorPosition.x,
            heightAt(this.tractorPosition.x, this.tractorPosition.z),
            this.tractorPosition.z,
        );
        this.tractor.rotation.y = this.tractorHeading;

        for (const wheel of this.tractorWheels) {
            wheel.rotation.x -= this.tractorSpeed * dt * 0.55;
        }

        this.positionDriveCamera();
    }

    // ------------------------------------------------------------------
    // API publique et boucle de rendu
    // ------------------------------------------------------------------

    public setHour(hour: number): void {
        this.hour = ((hour % 24) + 24) % 24;
        this.updateDaylight();
        this.options.onTime(this.hour);
    }

    public setAutoTime(enabled: boolean): void {
        this.autoTime = enabled;
    }

    public clearSelection(): void {
        this.selected = null;
        this.hovered = null;
        this.refreshHighlights();
        this.options.onSelect(null);
    }

    public setCropFilter(cropId: string | null): void {
        this.highlightCropId = cropId;
        this.refreshHighlights();
    }

    public focusCrop(cropId: string | null): void {
        this.highlightCropId = cropId;
        this.refreshHighlights();

        const matches =
            cropId === null ? this.plots : this.plots.filter((plot) => plot.crop !== undefined && String(plot.crop.id) === cropId);

        if (matches.length === 0) return;

        const center = matches
            .reduce((accumulator, plot) => accumulator.add(plot.position), new THREE.Vector3())
            .multiplyScalar(1 / matches.length);
        const spread = matches.reduce(
            (maximum, plot) => Math.max(maximum, plot.position.distanceTo(center) + Math.max(plot.width, plot.depth)),
            24,
        );
        const distance = clamp(spread * 1.7, 48, 175);

        this.mode = 'orbit';
        this.orbit.enabled = true;
        this.player.visible = true;
        this.orbit.target.copy(center).add(new THREE.Vector3(0, 4, 0));
        this.camera.position.copy(center).add(new THREE.Vector3(distance * 0.62, distance * 0.78, distance * 0.62));
        this.orbit.update();
    }

    public focusSelection(kind: 'plot' | 'water', id: string): void {
        const marker = kind === 'plot' ? this.plots.find((plot) => plot.id === id) : this.water.find((source) => source.id === id);
        if (!marker) return;

        this.selected = marker;
        this.refreshHighlights();
        this.mode = 'orbit';
        this.orbit.enabled = true;
        this.player.visible = true;
        this.orbit.target.copy(marker.position).add(new THREE.Vector3(0, 4, 0));
        this.camera.position.copy(marker.position).add(new THREE.Vector3(34, 32, 34));
        this.orbit.update();
    }

    public resetView(): void {
        this.mode = 'orbit';
        this.orbit.enabled = true;
        this.player.visible = true;
        this.orbit.target.set(0, 4, 0);
        this.camera.position.set(88, 74, 112);
        this.orbit.update();
    }

    private updateMinimap(force = false): void {
        const now = Date.now();
        if (!force && now - this.lastMinimapSync < 320) return;
        this.lastMinimapSync = now;

        this.options.onMinimap({
            plots: this.plots.map((plot) => ({
                id: plot.id,
                x: plot.position.x,
                z: plot.position.z,
                width: plot.width,
                depth: plot.depth,
                color: plot.status.css,
            })),
            water: this.water.map((source) => ({ x: source.position.x, z: source.position.z })),
            player: { x: this.playerPosition.x, z: this.playerPosition.z },
            tractor: { x: this.tractorPosition.x, z: this.tractorPosition.z },
        });
    }

    private resize(): void {
        const canvas = this.options.canvas;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (!width || !height) return;

        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.5 : 2));
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    private animate = (): void => {
        if (this.disposed) return;
        this.frame = requestAnimationFrame(this.animate);

        const dt = Math.min(this.clock.getDelta(), 0.06);
        const elapsed = this.clock.elapsedTime;

        if (this.autoTime) {
            this.hour = (this.hour + dt * 0.012) % 24;
            this.updateDaylight();

            if (elapsed - this.lastTimeSync > 0.5) {
                this.lastTimeSync = elapsed;
                this.options.onTime(this.hour);
            }
        }

        if (this.mode === 'orbit') {
            this.orbit.update();
        } else if (this.mode === 'walk') {
            this.updateWalk(dt);
        } else {
            this.updateDrive(dt);
        }

        if (this.windmillBlades) {
            this.windmillBlades.rotation.z += dt * 0.65;
        }

        if (this.pondWater) {
            this.pondWater.position.y = this.pondBaseY + 0.16 + Math.sin(elapsed * 1.4) * 0.025;
        }

        if (this.highlightCropId !== null) {
            const pulse = 0.22 + Math.sin(elapsed * 2.6) * 0.1;

            for (const plot of this.plots) {
                if (!this.matchesCropFilter(plot)) continue;
                const material = plot.highlight.material as THREE.MeshBasicMaterial;
                material.opacity = pulse;
            }
        }

        this.sky.position.copy(this.camera.position);
        this.stars.position.copy(this.camera.position);
        this.sunDisc.position.copy(this.camera.position).addScaledVector(this.skyDirection, 520);
        this.updateMinimap();
        this.renderer.render(this.scene, this.camera);

        if (!this.ready) {
            this.ready = true;
            this.options.onReady();
        }
    };

    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        cancelAnimationFrame(this.frame);
        this.listeners.forEach((remove) => remove());
        this.listeners.length = 0;
        this.resizeObserver?.disconnect();
        this.orbit.dispose();

        const geometries = new Set<THREE.BufferGeometry>();
        const materials = new Set<THREE.Material>();

        this.scene.traverse((object) => {
            if (
                object instanceof THREE.Mesh ||
                object instanceof THREE.Line ||
                object instanceof THREE.Points ||
                object instanceof THREE.Sprite
            ) {
                geometries.add(object.geometry);
                const material = object.material;
                if (Array.isArray(material)) {
                    material.forEach((entry) => materials.add(entry));
                } else {
                    materials.add(material);
                }
            }
        });

        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => disposeMaterial(material));
        this.renderer.dispose();
    }
}
