import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import {
    CROP_COLORS,
    FarmMinimap,
    FarmSelection,
    FarmWorldOptions,
    POND,
    PASTURE,
    PlotMarker,
    STATUS,
    WATER_SIZE,
    WaterMarker,
    WORLD_SIZE,
    YARD,
    clamp,
    disposeMaterial,
    gableRoofGeometry,
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
                    { x: 44, z: 39 },
                    { x: 62, z: 47 },
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

    private buildPlots(soil: THREE.CanvasTexture): void {
        const slots = plotSlots();
        let random = 0;

        this.options.rows.forEach((row, index) => {
            const slot = slots[index % slots.length];
            const statusKey = String(row.status ?? 'disponible');
            const status = STATUS[statusKey] ?? STATUS.disponible;
            const id = String(row.id);
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

            const [cropA, cropB] = CROP_COLORS[statusKey] ?? CROP_COLORS.disponible;
            const cropHeight = statusKey === 'en_culture' ? 1.35 : statusKey === 'en_repos' ? 0.55 : 0.35;
            const density = statusKey === 'indisponible' ? 0.35 : statusKey === 'disponible' ? 0.55 : 0.82;
            const spacingX = statusKey === 'en_culture' ? 1.15 : 1.55;
            const spacingZ = statusKey === 'en_culture' ? 1.35 : 1.8;
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
                color: status.color,
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
                    color: status.color,
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
                        `${String(row.name ?? 'Parcelle')} · ${status.label}`,
                        status.css,
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
            };
            this.plots.push(marker);
            pick.userData.marker = marker;
        });
    }
