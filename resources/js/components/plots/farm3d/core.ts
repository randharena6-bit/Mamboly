import * as THREE from 'three';

import type { ResourceRow } from '../../../resources/types';

export type ViewMode = 'orbit' | 'walk' | 'drive';
export type SelectionKind = 'plot' | 'water';
export type FarmSelection = {
    kind: SelectionKind;
    row: ResourceRow;
    crop?: ResourceRow;
    campaign?: ResourceRow;
} | null;

export type MinimapPlot = {
    id: string;
    x: number;
    z: number;
    width: number;
    depth: number;
    color: string;
};

export type FarmMinimap = {
    plots: MinimapPlot[];
    water: Array<{ x: number; z: number }>;
    player: { x: number; z: number };
    tractor: { x: number; z: number };
};

export type FarmWorldOptions = {
    canvas: HTMLCanvasElement;
    rows: ResourceRow[];
    waterSources: ResourceRow[];
    irrigations?: ResourceRow[];
    campaigns?: ResourceRow[];
    onSelect: (selection: FarmSelection) => void;
    onTime: (hour: number) => void;
    onMinimap: (minimap: FarmMinimap) => void;
    onReady: () => void;
};

export type StatusMeta = { label: string; color: number; css: string };

export type PlotMarker = {
    id: string;
    row: ResourceRow;
    group: THREE.Group;
    pick: THREE.Mesh;
    highlight: THREE.Mesh;
    position: THREE.Vector3;
    width: number;
    depth: number;
    status: StatusMeta;
    crop?: ResourceRow;
    campaign?: ResourceRow;
};

export type WaterMarker = {
    id: string;
    row: ResourceRow;
    group: THREE.Group;
    pick: THREE.Object3D;
    highlight: THREE.Mesh;
    position: THREE.Vector3;
};

export const WORLD_SIZE = 360;
export const WORLD_HALF = WORLD_SIZE / 2;
export const YARD = { x: 0, z: -5, radius: 48 };
export const POND = { x: 70, z: 49, radius: 15 };
export const PASTURE = { x: 64, z: -52, width: 34, depth: 30 };

export const STATUS: Record<string, StatusMeta> = {
    disponible: { label: 'Disponible', color: 0x5fbf5f, css: '#5fbf5f' },
    en_culture: { label: 'En culture', color: 0x3f92e0, css: '#3f92e0' },
    en_repos: { label: 'En repos', color: 0xd8a13b, css: '#d8a13b' },
    indisponible: { label: 'Indisponible', color: 0xd05b4c, css: '#d05b4c' },
};

export const CROP_COLORS: Record<string, [number, number]> = {
    disponible: [0x8bbd4c, 0xa9cf68],
    en_culture: [0x4f9f3f, 0x79b94f],
    en_repos: [0xc8a64f, 0xe0c36b],
    indisponible: [0x88664b, 0xa17a58],
};

export type CropKind = 'cereal' | 'legume' | 'fruit' | 'root' | 'other';

export type CropPalette = {
    base: number;
    light: number;
    css: string;
    height: number;
    kind: CropKind;
};

const CROP_RULES: Array<{ match: RegExp; kind: CropKind; hue: number }> = [
    { match: /(bl[eé]|riz|ma[iï]s|sorgho|mil|orge|avoine|c[eé]r[eé]ale|canne)/i, kind: 'cereal', hue: 0.12 },
    { match: /(tomate|piment|poivron|aubergine|l[eé]gume|haricot|pois|ni[eé]b[eé]|concombre|courge)/i, kind: 'legume', hue: 0.3 },
    { match: /(fruit|mangue|banane|agrume|orange|citron|papaye|ananas|avocat|pomme|raisin)/i, kind: 'fruit', hue: 0.04 },
    { match: /(manioc|patate|igname|carotte|betterave|racine|tubercule|navet)/i, kind: 'root', hue: 0.09 },
    { match: /(coton|tabac|caf[eé]|cacao|th[eé]|s[eé]same|tournesol|arachide|soja)/i, kind: 'other', hue: 0.17 },
];

function hashString(value: string): number {
    let hash = 2166136261;

    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0) / 4294967296;
}

/** Couleur, hauteur et silhouette stables d'une culture, dérivées de son nom. */
export function cropPalette(crop: ResourceRow): CropPalette {
    const label = `${String(crop.name ?? '')} ${String(crop.category ?? '')}`.trim();
    const rule = CROP_RULES.find((entry) => entry.match.test(label));
    const seed = hashString(label);
    const hue = rule ? rule.hue + (seed - 0.5) * 0.04 : seed;
    const kind = rule?.kind ?? 'other';
    const height =
        kind === 'cereal' ? 1.85 : kind === 'fruit' ? 1.55 : kind === 'legume' ? 1.15 : kind === 'root' ? 0.7 : 1.05;
    const base = new THREE.Color().setHSL((hue + 1) % 1, 0.55, 0.42);
    const light = new THREE.Color().setHSL((hue + 1) % 1, 0.62, 0.58);

    return {
        base: base.getHex(),
        light: light.getHex(),
        css: `#${base.getHexString()}`,
        height,
        kind,
    };
}

export const clamp = THREE.MathUtils.clamp;

export function smoothstep(edge0: number, edge1: number, value: number): number {
    const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}

export function mulberry32(seed: number) {
    let value = seed;

    return () => {
        value |= 0;
        value = (value + 0x6d2b79f5) | 0;
        let result = Math.imul(value ^ (value >>> 15), 1 | value);
        result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
        return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
}

export function hash(x: number, z: number): number {
    const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
    return value - Math.floor(value);
}

export function heightAt(x: number, z: number): number {
    const distance = Math.max(Math.abs(x), Math.abs(z));
    const edge = smoothstep(76, 172, distance);
    const hills =
        Math.sin(x * 0.027) * Math.cos(z * 0.023) * 4.2 +
        Math.sin((x + z) * 0.049) * 1.1 +
        Math.cos(x * 0.013 + z * 0.017) * 2.8;
    const bumps = (hash(x * 0.15, z * 0.15) - 0.5) * 0.35;

    return (hills + bumps) * edge;
}

export function rectMaxHeight(cx: number, cz: number, width: number, depth: number): number {
    let max = heightAt(cx, cz);

    for (let ix = -2; ix <= 2; ix += 1) {
        for (let iz = -2; iz <= 2; iz += 1) {
            max = Math.max(max, heightAt(cx + (ix / 2) * (width / 2), cz + (iz / 2) * (depth / 2)));
        }
    }

    return max;
}

export function noiseTexture(base: string, shades: string[], speckles = 4200, size = 256): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, size, size);

        const random = mulberry32(base.length * 977 + shades.length * 311);

        for (let index = 0; index < speckles; index += 1) {
            ctx.fillStyle = shades[Math.floor(random() * shades.length)];
            const x = random() * size;
            const y = random() * size;
            const radius = 0.4 + random() * 2.2;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        for (let index = 0; index < 24; index += 1) {
            ctx.globalAlpha = 0.05 + random() * 0.08;
            ctx.fillStyle = random() > 0.5 ? '#ffffff' : '#000000';
            ctx.beginPath();
            ctx.arc(random() * size, random() * size, 12 + random() * 34, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;

    return texture;
}

export function labelTexture(title: string, subtitle: string, accent: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 168;
    const ctx = canvas.getContext('2d');

    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(31, 41, 55, 0.94)';
        ctx.beginPath();
        ctx.roundRect(8, 10, canvas.width - 16, canvas.height - 20, 22);
        ctx.fill();

        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.roundRect(8, 10, 18, canvas.height - 20, [22, 0, 0, 22]);
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 56px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(title.slice(0, 18), 46, 66);

        ctx.fillStyle = 'rgba(226, 232, 240, 0.82)';
        ctx.font = '31px system-ui, sans-serif';
        ctx.fillText(subtitle.slice(0, 30), 46, 122);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    return texture;
}

export function sunTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    if (ctx) {
        const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(255, 252, 226, 1)');
        gradient.addColorStop(0.25, 'rgba(255, 242, 184, 0.95)');
        gradient.addColorStop(0.55, 'rgba(255, 209, 112, 0.32)');
        gradient.addColorStop(1, 'rgba(255, 196, 80, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    return texture;
}

export function gableRoofGeometry(width: number, depth: number, rise: number): THREE.BufferGeometry {
    const w = width / 2;
    const d = depth / 2;
    const vertices = new Float32Array([
        -w, 0, -d, w, 0, -d, 0, rise, -d,
        -w, 0, d, w, 0, d, 0, rise, d,
    ]);
    const indices = [
        0, 1, 2,
        3, 5, 4,
        0, 2, 5, 0, 5, 3,
        1, 4, 5, 1, 5, 2,
        0, 3, 4, 0, 4, 1,
    ];
    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
}

export function ribbon(
    points: Array<{ x: number; z: number }>,
    width: number,
    material: THREE.Material,
    yOffset = 0.14,
): THREE.Mesh {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    let distance = 0;

    for (let index = 0; index < points.length; index += 1) {
        const previous = points[Math.max(0, index - 1)];
        const next = points[Math.min(points.length - 1, index + 1)];
        const tangent = new THREE.Vector2(next.x - previous.x, next.z - previous.z).normalize();
        const normal = new THREE.Vector2(-tangent.y, tangent.x).multiplyScalar(width / 2);
        const point = points[index];

        if (index > 0) {
            distance += Math.hypot(point.x - previous.x, point.z - previous.z);
        }

        positions.push(
            point.x + normal.x,
            heightAt(point.x + normal.x, point.z + normal.y) + yOffset,
            point.z + normal.y,
            point.x - normal.x,
            heightAt(point.x - normal.x, point.z - normal.y) + yOffset,
            point.z - normal.y,
        );
        uvs.push(0, distance / width, 1, distance / width);

        if (index < points.length - 1) {
            const base = index * 2;
            indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;

    return mesh;
}

export function plotSlots(): Array<{ x: number; z: number; width: number; depth: number }> {
    const slots: Array<{ x: number; z: number; width: number; depth: number }> = [];

    for (const x of [-108, 108]) {
        for (const z of [-82, -25, 32, 89]) {
            slots.push({ x, z, width: 44, depth: 30 });
        }
    }

    for (const z of [-114, 114]) {
        for (const x of [-34, 34]) {
            slots.push({ x, z, width: 50, depth: 28 });
        }
    }

    for (const x of [-108, 108]) {
        for (const z of [-140, 140]) {
            slots.push({ x, z, width: 40, depth: 24 });
        }
    }

    for (const z of [-145, 145]) {
        for (const x of [-34, 34]) {
            slots.push({ x, z, width: 42, depth: 22 });
        }
    }

    return slots;
}

export function disposeMaterial(material: THREE.Material): void {
    const textures = new Set<THREE.Texture>();

    for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
    }

    textures.forEach((texture) => texture.dispose());
    material.dispose();
}
