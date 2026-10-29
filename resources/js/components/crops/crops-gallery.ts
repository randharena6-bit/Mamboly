import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import type { ResourceRow } from '../../resources/types';
import { cropPalette, disposeMaterial, labelTexture, mulberry32 } from '../plots/farm3d/core';
import type { CropPalette } from '../plots/farm3d/core';

export type CropGalleryOptions = {
    canvas: HTMLCanvasElement;
    rows: ResourceRow[];
    onSelect: (row: ResourceRow | null) => void;
    onReady: () => void;
};

type Specimen = {
    row: ResourceRow;
    group: THREE.Group;
    sway: THREE.Object3D[];
    waterFill: THREE.Mesh;
    waterRatio: number;
    gaugeHeight: number;
    phase: number;
    pick: THREE.Mesh;
};

const MAX_SPECIMENS = 20;
const GAUGE_HEIGHT = 3;

export class CropGallery {
    readonly scene: THREE.Scene;
    readonly camera: THREE.PerspectiveCamera;
    readonly renderer: THREE.WebGLRenderer;

    private readonly options: CropGalleryOptions;
    private readonly clock = new THREE.Clock();
    private readonly orbit: OrbitControls;
    private readonly listeners: Array<() => void> = [];
    private readonly ring = new THREE.Group();
    private readonly specimens: Specimen[] = [];
    private readonly pickables: THREE.Object3D[] = [];
    private readonly particles: THREE.Points;
    private readonly raycaster = new THREE.Raycaster();
    private readonly pointerNdc = new THREE.Vector2();

    private frame = 0;
    private disposed = false;
    private ready = false;
    private autoRotate = true;
    private selectedIndex: number | null = null;
    private hoveredIndex: number | null = null;
    private pointer = { down: false, x: 0, y: 0, moved: 0 };
    private resizeObserver: ResizeObserver | null = null;

    constructor(options: CropGalleryOptions) {
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
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x070d18);
        this.scene.fog = new THREE.Fog(0x070d18, 30, 96);

        this.camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 220);
        this.camera.position.set(0, 15, 36);

        this.orbit = new OrbitControls(this.camera, options.canvas);
        this.orbit.target.set(0, 3.4, 0);
        this.orbit.enableDamping = true;
        this.orbit.dampingFactor = 0.06;
        this.orbit.enablePan = false;
        this.orbit.minDistance = 11;
        this.orbit.maxDistance = 62;
        this.orbit.minPolarAngle = 0.16;
        this.orbit.maxPolarAngle = Math.PI * 0.49;
        this.orbit.update();

        this.buildLights();
        this.buildPlatform();
        this.buildSpecimens();
        this.particles = this.buildParticles();
        this.bindEvents();

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(options.canvas);
        this.resize();
        this.animate();
    }

    private buildLights(): void {
        const hemisphere = new THREE.HemisphereLight(0xbfe3ff, 0x111827, 1.15);
        this.scene.add(hemisphere);

        const key = new THREE.DirectionalLight(0xfff1cf, 2.6);
        key.position.set(14, 24, 16);
        this.scene.add(key);

        const rim = new THREE.DirectionalLight(0x38bdf8, 1.1);
        rim.position.set(-18, 10, -14);
        this.scene.add(rim);

        const emerald = new THREE.PointLight(0x34d399, 55, 46, 2);
        emerald.position.set(-14, 8, -8);
        this.scene.add(emerald);

        const sky = new THREE.PointLight(0x38bdf8, 45, 42, 2);
        sky.position.set(15, 9, -10);
        this.scene.add(sky);

        const amber = new THREE.PointLight(0xf59e0b, 26, 34, 2);
        amber.position.set(0, 6, 17);
        this.scene.add(amber);
    }

    private buildPlatform(): void {
        const floor = new THREE.Mesh(
            new THREE.CircleGeometry(27, 72),
            new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.72, metalness: 0.28 }),
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.02;
        this.scene.add(floor);

        const grid = new THREE.GridHelper(52, 26, 0x1e293b, 0x111827);
        grid.position.y = 0.005;
        this.scene.add(grid);

        for (const [radius, color, opacity] of [
            [13, 0x34d399, 0.55],
            [20, 0x38bdf8, 0.3],
        ] as const) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(radius, 0.06, 8, 96),
                new THREE.MeshBasicMaterial({ color, transparent: true, opacity }),
            );
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.03;
            this.scene.add(ring);
        }
    }

    private buildParticles(): THREE.Points {
        const random = mulberry32(4177);
        const positions: number[] = [];

        for (let index = 0; index < 260; index += 1) {
            const angle = random() * Math.PI * 2;
            const radius = 4 + random() * 24;
            positions.push(
                Math.cos(angle) * radius,
                0.6 + random() * 14,
                Math.sin(angle) * radius,
            );
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0x7dd3fc,
            size: 0.11,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.55,
            depthWrite: false,
        });

        const points = new THREE.Points(geometry, material);
        this.scene.add(points);

        return points;
    }

    private buildSpecimens(): void {
        const rows = this.options.rows.slice(0, MAX_SPECIMENS);

        if (rows.length === 0) return;

        const maxWater = Math.max(1, ...rows.map((row) => Number(row.water_requirement ?? 0)));
        const radius = rows.length === 1 ? 0 : Math.min(19.5, Math.max(8, rows.length * 1.15));

        rows.forEach((row, index) => {
            const palette = cropPalette(row);
            const angle = (index / rows.length) * Math.PI * 2;
            const group = new THREE.Group();
            group.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
            group.rotation.y = -angle + Math.PI / 2;

            const pedestal = new THREE.Mesh(
                new THREE.CylinderGeometry(2.25, 2.4, 0.5, 28),
                new THREE.MeshStandardMaterial({ color: 0x111c2e, roughness: 0.6, metalness: 0.35 }),
            );
            pedestal.position.y = 0.25;
            group.add(pedestal);

            const cap = new THREE.Mesh(
                new THREE.CylinderGeometry(2.05, 2.05, 0.1, 28),
                new THREE.MeshStandardMaterial({
                    color: palette.base,
                    emissive: palette.base,
                    emissiveIntensity: 0.35,
                    roughness: 0.5,
                    metalness: 0.2,
                }),
            );
            cap.position.y = 0.53;
            group.add(cap);

            const soil = new THREE.Mesh(
                new THREE.CylinderGeometry(1.7, 1.7, 0.14, 24),
                new THREE.MeshStandardMaterial({ color: 0x3d2d21, roughness: 1 }),
            );
            soil.position.y = 0.62;
            group.add(soil);

            const plant = createPlant(palette, row, index * 977 + 13);
            plant.group.position.y = 0.66;
            group.add(plant.group);

            const waterRatio = Math.min(1, Math.max(0.08, Number(row.water_requirement ?? 0) / maxWater));
            const gauge = this.createGauge(palette, waterRatio);
            gauge.group.position.set(2.7, 0.6, 0.55);
            group.add(gauge.group);

            const sign = new THREE.Sprite(
                new THREE.SpriteMaterial({
                    map: labelTexture(
                        String(row.name ?? `Culture ${index + 1}`),
                        `${Number(row.water_requirement ?? 0)} L/m² · ${String(row.estimated_duration_days ?? '—')} j`,
                        palette.css,
                    ),
                    transparent: true,
                    depthTest: true,
                    depthWrite: false,
                }),
            );
            sign.scale.set(7.6, 2.5, 1);
            sign.position.set(0, 4.9, 0);
            group.add(sign);

            const pick = new THREE.Mesh(
                new THREE.CylinderGeometry(2.7, 2.7, 5.4, 12),
                new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
            );
            pick.position.y = 2.7;
            pick.userData.index = index;
            group.add(pick);
            this.pickables.push(pick);

            this.ring.add(group);
            this.specimens.push({
                row,
                group,
                sway: plant.sway,
                waterFill: gauge.fill,
                waterRatio,
                gaugeHeight: GAUGE_HEIGHT,
                phase: index * 0.83,
                pick,
            });
        });

        this.scene.add(this.ring);
    }

    private createGauge(palette: CropPalette, ratio: number): { group: THREE.Group; fill: THREE.Mesh } {
        const group = new THREE.Group();

        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(0.34, 0.42, 0.16, 16),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.3 }),
        );
        base.position.y = 0.08;
        group.add(base);

        const tube = new THREE.Mesh(
            new THREE.CylinderGeometry(0.24, 0.24, GAUGE_HEIGHT, 14, 1, true),
            new THREE.MeshStandardMaterial({
                color: 0x7dd3fc,
                transparent: true,
                opacity: 0.16,
                roughness: 0.15,
                metalness: 0.1,
                side: THREE.DoubleSide,
            }),
        );
        tube.position.y = GAUGE_HEIGHT / 2 + 0.12;
        group.add(tube);

        const fillGeometry = new THREE.CylinderGeometry(0.17, 0.17, 1, 12);
        fillGeometry.translate(0, 0.5, 0);
        const fill = new THREE.Mesh(
            fillGeometry,
            new THREE.MeshStandardMaterial({
                color: 0x38bdf8,
                emissive: 0x0ea5e9,
                emissiveIntensity: 0.55,
                roughness: 0.2,
                metalness: 0.1,
            }),
        );
        fill.position.y = 0.12;
        fill.scale.y = ratio * GAUGE_HEIGHT;
        group.add(fill);

        const crown = new THREE.Mesh(
            new THREE.TorusGeometry(0.26, 0.035, 6, 18),
            new THREE.MeshStandardMaterial({ color: palette.light, emissive: palette.base, emissiveIntensity: 0.4 }),
        );
        crown.rotation.x = Math.PI / 2;
        crown.position.y = GAUGE_HEIGHT + 0.14;
        group.add(crown);

        return { group, fill };
    }

    private bindEvents(): void {
        const canvas = this.options.canvas;

        const onPointerDown = (event: PointerEvent) => {
            this.pointer = { down: true, x: event.clientX, y: event.clientY, moved: 0 };
        };

        const onPointerMove = (event: PointerEvent) => {
            if (this.pointer.down) {
                this.pointer.moved += Math.abs(event.clientX - this.pointer.x) + Math.abs(event.clientY - this.pointer.y);
                this.pointer.x = event.clientX;
                this.pointer.y = event.clientY;
                return;
            }

            const index = this.indexAt(event);
            this.hoveredIndex = index;
            canvas.style.cursor = index === null ? 'grab' : 'pointer';
        };

        const onPointerUp = (event: PointerEvent) => {
            const wasClick = this.pointer.moved < 6;
            this.pointer.down = false;

            if (wasClick) {
                const index = this.indexAt(event);
                this.select(index);
            }
        };

        const onPointerLeave = () => {
            this.hoveredIndex = null;
            canvas.style.cursor = 'grab';
        };

        const onContextMenu = (event: Event) => event.preventDefault();

        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointerleave', onPointerLeave);
        canvas.addEventListener('contextmenu', onContextMenu);

        this.listeners.push(
            () => canvas.removeEventListener('pointerdown', onPointerDown),
            () => canvas.removeEventListener('pointermove', onPointerMove),
            () => canvas.removeEventListener('pointerup', onPointerUp),
            () => canvas.removeEventListener('pointerleave', onPointerLeave),
            () => canvas.removeEventListener('contextmenu', onContextMenu),
        );
    }

    private indexAt(event: PointerEvent): number | null {
        const rect = this.options.canvas.getBoundingClientRect();
        this.pointerNdc.set(
            ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1,
            -((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1,
        );
        this.raycaster.setFromCamera(this.pointerNdc, this.camera);
        const hits = this.raycaster.intersectObjects(this.pickables, false);
        const index = hits[0]?.object.userData.index;

        return typeof index === 'number' ? index : null;
    }

    private select(index: number | null): void {
        this.selectedIndex = index;
        this.options.onSelect(index === null ? null : this.specimens[index].row);
    }

    public focusCrop(cropId: string): void {
        const index = this.specimens.findIndex((specimen) => String(specimen.row.id) === cropId);
        if (index >= 0) this.select(index);
    }

    public clearSelection(): void {
        this.select(null);
    }

    public setAutoRotate(enabled: boolean): void {
        this.autoRotate = enabled;
    }

    public resetView(): void {
        this.select(null);
        this.orbit.target.set(0, 3.4, 0);
        this.camera.position.set(0, 15, 36);
        this.orbit.update();
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

        if (this.autoRotate && this.selectedIndex === null) {
            this.ring.rotation.y += dt * 0.14;
        }

        this.specimens.forEach((specimen, index) => {
            const targetScale = index === this.selectedIndex ? 1.16 : index === this.hoveredIndex ? 1.06 : 1;
            specimen.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);

            for (const pivot of specimen.sway) {
                pivot.rotation.z = Math.sin(elapsed * 1.35 + specimen.phase) * 0.055;
                pivot.rotation.x = Math.cos(elapsed * 1.05 + specimen.phase) * 0.03;
            }

            specimen.waterFill.scale.y =
                specimen.waterRatio * specimen.gaugeHeight * (1 + Math.sin(elapsed * 2 + specimen.phase) * 0.02);
        });

        this.particles.rotation.y += dt * 0.02;

        if (this.selectedIndex !== null) {
            const selected = this.specimens[this.selectedIndex];
            const world = new THREE.Vector3();
            selected.group.getWorldPosition(world);
            this.orbit.target.lerp(new THREE.Vector3(world.x, 2.6, world.z), 0.08);
        } else {
            this.orbit.target.lerp(new THREE.Vector3(0, 3.4, 0), 0.05);
        }

        this.orbit.update();
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

function createPlant(
    palette: CropPalette,
    row: ResourceRow,
    seed: number,
): { group: THREE.Group; sway: THREE.Object3D[] } {
    const group = new THREE.Group();
    const sway: THREE.Object3D[] = [];
    const random = mulberry32(seed + String(row.name ?? '').length * 131);

    const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x4f7c3a, roughness: 0.9 });
    const leafMaterial = new THREE.MeshStandardMaterial({ color: palette.base, roughness: 0.85, flatShading: true });
    const accentMaterial = new THREE.MeshStandardMaterial({
        color: palette.light,
        emissive: palette.base,
        emissiveIntensity: 0.18,
        roughness: 0.7,
    });

    const addPivot = (height: number): THREE.Group => {
        const pivot = new THREE.Group();
        pivot.position.y = height;
        pivot.userData.phase = random() * Math.PI * 2;
        group.add(pivot);
        sway.push(pivot);

        return pivot;
    };

    if (palette.kind === 'cereal') {
        const count = 7 + Math.floor(random() * 4);

        for (let index = 0; index < count; index += 1) {
            const height = 1.25 + random() * 1.05;
            const pivot = addPivot(0.02);
            pivot.position.x = (random() - 0.5) * 1.5;
            pivot.position.z = (random() - 0.5) * 1.5;

            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, height, 5), stemMaterial);
            stem.position.y = height / 2;
            pivot.add(stem);

            const head = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.44, 6), accentMaterial);
            head.position.y = height + 0.16;
            pivot.add(head);
        }

        return { group, sway };
    }

    if (palette.kind === 'legume') {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 1.15, 6), stemMaterial);
        stem.position.y = 0.58;
        group.add(stem);

        const count = 5 + Math.floor(random() * 3);

        for (let index = 0; index < count; index += 1) {
            const pivot = addPivot(0.35 + random() * 0.75);
            pivot.rotation.y = random() * Math.PI * 2;
            pivot.rotation.z = (random() - 0.5) * 1.3;

            const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.72, 5), stemMaterial);
            branch.position.y = 0.34;
            pivot.add(branch);

            const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), leafMaterial);
            leaf.scale.set(1.25, 0.28, 0.8);
            leaf.position.set(0.16, 0.62, 0);
            pivot.add(leaf);

            if (index % 2 === 0) {
                const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.34, 4, 8), accentMaterial);
                pod.position.set(-0.14, 0.46, 0.08);
                pod.rotation.z = 0.7;
                pivot.add(pod);
            }
        }

        return { group, sway };
    }

    if (palette.kind === 'fruit') {
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16, 0.23, 1.5, 7),
            new THREE.MeshStandardMaterial({ color: 0x6b4a31, roughness: 0.95 }),
        );
        trunk.position.y = 0.75;
        group.add(trunk);

        const canopy = addPivot(1.5);
        const blobs = 3 + Math.floor(random() * 2);

        for (let index = 0; index < blobs; index += 1) {
            const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.68 + random() * 0.32, 0), leafMaterial);
            blob.position.set((random() - 0.5) * 1.3, 0.2 + random() * 0.8, (random() - 0.5) * 1.3);
            canopy.add(blob);
        }

        const fruits = 6 + Math.floor(random() * 4);

        for (let index = 0; index < fruits; index += 1) {
            const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), accentMaterial);
            fruit.position.set((random() - 0.5) * 1.7, 0.1 + random() * 1, (random() - 0.5) * 1.7);
            canopy.add(fruit);
        }

        return { group, sway };
    }

    if (palette.kind === 'root') {
        const root = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.7, 8), accentMaterial);
        root.position.y = 0.18;
        root.rotation.x = Math.PI;
        group.add(root);

        const count = 6 + Math.floor(random() * 4);

        for (let index = 0; index < count; index += 1) {
            const pivot = addPivot(0.12);
            pivot.rotation.y = (index / count) * Math.PI * 2;
            pivot.rotation.z = 0.5 + random() * 0.55;

            const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.9 + random() * 0.4, 5), leafMaterial);
            leaf.position.y = 0.45;
            pivot.add(leaf);
        }

        return { group, sway };
    }

    const count = 8 + Math.floor(random() * 5);

    for (let index = 0; index < count; index += 1) {
        const height = 0.8 + random() * 0.8;
        const pivot = addPivot(0.02);
        pivot.position.x = (random() - 0.5) * 1.4;
        pivot.position.z = (random() - 0.5) * 1.4;
        pivot.rotation.y = random() * Math.PI;

        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.1, height, 5), index % 3 === 0 ? accentMaterial : leafMaterial);
        blade.position.y = height / 2;
        pivot.add(blade);
    }

    return { group, sway };
}
