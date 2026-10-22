import * as THREE from 'three';

/**
 * Terrain 3D : chargement de l'imagerie satellite réelle et du modèle
 * numérique de terrain (MNT) autour de l'exploitation, puis projection
 * latitude/longitude ↔ coordonnées locales en mètres.
 *
 * - Imagerie : tuiles Esri « World Imagery » (accès libre, sans clé).
 * - Relief : tuiles « Terrarium » (AWS Open Data), élévation en mètres.
 *
 * Les deux sources sont chargées indépendamment : si l'une échoue (réseau,
 * CORS), le rendu se replie proprement sur un décor procédural.
 */

export type LatLng = { lat: number; lng: number };
export type WorldPoint = { x: number; z: number };

const TILE_SIZE = 256;
const EARTH_CIRCUMFERENCE = 40075016.686;
const DEFAULT_CENTER: LatLng = { lat: -18.9167, lng: 47.5167 };
const MIN_ZOOM = 12;
const MAX_ZOOM = 15;
const TILE_COUNT = 2;
const CANVAS_SIZE = TILE_COUNT * TILE_SIZE;

const IMAGERY_URL = (z: number, x: number, y: number) =>
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

const ELEVATION_URL = (z: number, x: number, y: number) =>
    `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

export function mercatorPixel(lat: number, lng: number, zoom: number): { x: number; y: number } {
    const scale = TILE_SIZE * 2 ** zoom;
    const x = ((lng + 180) / 360) * scale;
    const latRad = (lat * Math.PI) / 180;
    const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale;

    return { x, y };
}

export function metersPerPixel(lat: number, zoom: number): number {
    return (Math.cos((lat * Math.PI) / 180) * EARTH_CIRCUMFERENCE) / (TILE_SIZE * 2 ** zoom);
}

/** Décors d'eau générés avec le terrain procédural (aucun équivalent en base). */
export type TerrainDecor = {
    /** Tracé de la rivière, en coordonnées monde. */
    river: Array<{ x: number; z: number; y: number; width: number }>;
    lake: { x: number; z: number; radius: number; y: number };
};

export type TerrainTileset = {
    center: LatLng;
    zoom: number;
    canvasSize: number;
    metersPerPixel: number;
    worldSize: number;
    colorTexture: THREE.Texture;
    hasImagery: boolean;
    hasElevation: boolean;
    minElevation: number;
    maxElevation: number;
    project: (lat: number, lng: number) => WorldPoint;
    heightAt: (x: number, z: number) => number;
    /** Présent uniquement sur le terrain procédural (aucune donnée GPS). */
    decor?: TerrainDecor;
    dispose: () => void;
};

function clampZoom(zoom: number): number {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom)));
}

/**
 * Cache de tuiles : une reconstruction de scène (actualisation des données,
 * changement de qualité) ne re-télécharge pas l'imagerie ni le relief.
 * Les échecs sont mémorisés aussi, pour ne pas marteler un réseau défaillant.
 */
const tileCache = new Map<string, HTMLImageElement | null>();

function loadTile(url: string): Promise<HTMLImageElement | null> {
    const cached = tileCache.get(url);
    if (cached !== undefined) return Promise.resolve(cached);

    return new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';

        const settle = (value: HTMLImageElement | null) => {
            tileCache.set(url, value);
            resolve(value);
        };

        const timer = window.setTimeout(() => {
            image.onload = null;
            image.onerror = null;
            settle(null);
        }, 12000);

        image.onload = () => {
            window.clearTimeout(timer);
            settle(image);
        };

        image.onerror = () => {
            window.clearTimeout(timer);
            settle(null);
        };

        image.src = url;
    });
}

async function stitchTiles(
    urlFor: (zoom: number, x: number, y: number) => string,
    zoom: number,
    tileX0: number,
    tileY0: number,
): Promise<HTMLCanvasElement | null> {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    const jobs: Promise<HTMLImageElement | null>[] = [];

    for (let row = 0; row < TILE_COUNT; row += 1) {
        for (let col = 0; col < TILE_COUNT; col += 1) {
            const tileX = tileX0 + col;
            const tileY = tileY0 + row;
            const url = urlFor(zoom, tileX, tileY);

            jobs.push(
                loadTile(url).then((image) => {
                    if (image) ctx.drawImage(image, col * TILE_SIZE, row * TILE_SIZE);
                    return image;
                }),
            );
        }
    }

    const results = await Promise.all(jobs);

    if (results.every((result) => result === null)) return null;

    return canvas;
}

function decodeElevation(canvas: HTMLCanvasElement): Float32Array | null {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    const { data } = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const heights = new Float32Array(CANVAS_SIZE * CANVAS_SIZE);

    for (let index = 0; index < heights.length; index += 1) {
        const offset = index * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];

        heights[index] = r * 256 + g + b / 256 - 32768;
    }

    return heights;
}

export type TerrainOptions = {
    /** Zoom forcé (sinon calculé d'après l'étendue des points). */
    zoom?: number;
};

/**
 * Prépare un jeu de tuiles centré sur les points fournis.
 * `points` peut être vide : on retombe alors sur le centre par défaut.
 */
export async function loadTerrainTileset(
    points: LatLng[],
    options: TerrainOptions = {},
): Promise<TerrainTileset> {
    const valid = points.filter(
        (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng),
    );

    const center: LatLng = valid.length
        ? {
              lat: valid.reduce((sum, point) => sum + point.lat, 0) / valid.length,
              lng: valid.reduce((sum, point) => sum + point.lng, 0) / valid.length,
          }
        : DEFAULT_CENTER;

    const latValues = valid.map((point) => point.lat);
    const lngValues = valid.map((point) => point.lng);
    const latSpan = latValues.length ? Math.max(...latValues) - Math.min(...latValues) : 0;
    const lngSpan = lngValues.length ? Math.max(...lngValues) - Math.min(...lngValues) : 0;
    const spanMeters = Math.max(
        latSpan * 111320,
        lngSpan * 111320 * Math.cos((center.lat * Math.PI) / 180),
        240,
    ) * 2;

    const targetMpp = spanMeters / CANVAS_SIZE;
    const computedZoom = Math.log2(
        (Math.cos((center.lat * Math.PI) / 180) * EARTH_CIRCUMFERENCE) / (TILE_SIZE * targetMpp),
    );
    const zoom = options.zoom ?? clampZoom(computedZoom);

    const mpp = metersPerPixel(center.lat, zoom);
    const centerPixel = mercatorPixel(center.lat, center.lng, zoom);

    const maxTile = 2 ** zoom - 1;
    const tileX0 = Math.min(Math.max(Math.floor((centerPixel.x - CANVAS_SIZE / 2) / TILE_SIZE), 0), maxTile - TILE_COUNT + 1);
    const tileY0 = Math.min(Math.max(Math.floor((centerPixel.y - CANVAS_SIZE / 2) / TILE_SIZE), 0), maxTile - TILE_COUNT + 1);

    const originX = tileX0 * TILE_SIZE;
    const originY = tileY0 * TILE_SIZE;

    const [imageryCanvas, elevationCanvas] = await Promise.all([
        stitchTiles(IMAGERY_URL, zoom, tileX0, tileY0),
        stitchTiles(ELEVATION_URL, zoom, tileX0, tileY0),
    ]);

    let colorTexture: THREE.Texture;

    if (imageryCanvas) {
        colorTexture = new THREE.CanvasTexture(imageryCanvas);
        colorTexture.colorSpace = THREE.SRGBColorSpace;
        colorTexture.wrapS = THREE.ClampToEdgeWrapping;
        colorTexture.wrapT = THREE.ClampToEdgeWrapping;
        colorTexture.minFilter = THREE.LinearMipmapLinearFilter;
        colorTexture.magFilter = THREE.LinearFilter;
        colorTexture.generateMipmaps = true;
        colorTexture.needsUpdate = true;
    } else {
        colorTexture = proceduralGroundTexture();
    }

    const heights = elevationCanvas ? decodeElevation(elevationCanvas) : null;

    let minElevation = 0;
    let maxElevation = 0;

    if (heights) {
        minElevation = Infinity;
        maxElevation = -Infinity;

        for (let index = 0; index < heights.length; index += 1) {
            const value = heights[index];
            if (value < minElevation) minElevation = value;
            if (value > maxElevation) maxElevation = value;
        }

        if (!Number.isFinite(minElevation)) minElevation = 0;
        if (!Number.isFinite(maxElevation)) maxElevation = 0;
    }

    const project = (lat: number, lng: number): WorldPoint => {
        const pixel = mercatorPixel(lat, lng, zoom);

        return {
            x: (pixel.x - originX - CANVAS_SIZE / 2) * mpp,
            z: (pixel.y - originY - CANVAS_SIZE / 2) * mpp,
        };
    };

    const heightAt = (x: number, z: number): number => {
        if (!heights) return 0;

        const px = Math.round(x / mpp + CANVAS_SIZE / 2);
        const py = Math.round(z / mpp + CANVAS_SIZE / 2);

        if (px < 0 || py < 0 || px >= CANVAS_SIZE || py >= CANVAS_SIZE) return 0;

        // Flip Y to match Mercator projection
        const flippedPy = CANVAS_SIZE - 1 - py;
        return heights[flippedPy * CANVAS_SIZE + px];
    };

    return {
        center,
        zoom,
        canvasSize: CANVAS_SIZE,
        metersPerPixel: mpp,
        worldSize: CANVAS_SIZE * mpp,
        colorTexture,
        hasImagery: imageryCanvas !== null,
        hasElevation: heights !== null,
        minElevation,
        maxElevation,
        project,
        heightAt,
        dispose: () => colorTexture.dispose(),
    };
}

export function proceduralGroundTexture(): THREE.Texture {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (ctx) {
        // Base grass
        const gradient = ctx.createLinearGradient(0, 0, 0, size);
        gradient.addColorStop(0, '#3f7c3f');
        gradient.addColorStop(1, '#2f5f2f');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // Subtle noise
        const noise = ctx.createImageData(size, size);
        for (let i = 0; i < noise.data.length; i += 4) {
            const v = (Math.random() * 30) - 15;
            noise.data[i] = v;
            noise.data[i + 1] = v + 20;
            noise.data[i + 2] = v;
            noise.data[i + 3] = 8;
        }
        ctx.putImageData(noise, 0, 0);

        // Small clumps
        const palette = ['#4a8a3a', '#3d7230', '#569141', '#4c7f38'];
        for (let index = 0; index < 8000; index += 1) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const radius = 0.8 + Math.random() * 2.4;
            ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)];
            ctx.globalAlpha = 0.18 + Math.random() * 0.25;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(56, 56);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;

    return texture;
}

/* ------------------------------------------------------------------ */
/* Terrain procédural                                                  */
/* ------------------------------------------------------------------ */

/**
 * Généré quand aucune parcelle ni ressource en eau n'a de coordonnées : on
 * n'affiche alors aucune imagerie satellite (qui localiserait arbitrairement
 * l'exploitation), mais un relief inventé, explicitement signalé comme tel.
 */
const PROCEDURAL_SIZE = 1400;
const PROCEDURAL_CENTER: LatLng = { lat: -18.9167, lng: 47.5167 };
const PROCEDURAL_LAKE = { x: -320, z: 230, radius: 95 };
const PROCEDURAL_WATER_LEVEL = 3.4;
const LAKE_WATER_LEVEL = 7.2;

const smoothstep = (edge0: number, edge1: number, value: number): number => {
    const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
};

function hashNoise(x: number, y: number): number {
    const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return value - Math.floor(value);
}

function valueNoise(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);

    const a = hashNoise(ix, iy);
    const b = hashNoise(ix + 1, iy);
    const c = hashNoise(ix, iy + 1);
    const d = hashNoise(ix + 1, iy + 1);

    return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
}

function fbm(x: number, y: number, octaves = 5): number {
    let amplitude = 0.5;
    let frequency = 1;
    let sum = 0;
    let normalization = 0;

    for (let octave = 0; octave < octaves; octave += 1) {
        sum += valueNoise(x * frequency, y * frequency) * amplitude;
        normalization += amplitude;
        amplitude *= 0.5;
        frequency *= 2.03;
    }

    return sum / normalization;
}

/** Tracé sinusoïdal de la rivière (repère monde) : z en fonction de x. */
const riverPath = (x: number): number => Math.sin(x / 170) * 150 + Math.sin(x / 61) * 34;

function proceduralHeight(x: number, z: number): number {
    const hills = Math.pow(fbm(x / 260 + 12.3, z / 260 + 4.7, 5), 1.5) * 74;
    const ridges = Math.pow(1 - Math.abs(fbm(x / 620 - 3.1, z / 620 + 8.9, 3) * 2 - 1), 2) * 34;
    let height = hills + ridges * 0.6 - 6;

    // Plaine centrale : le terrain s'aplanit autour de l'origine.
    const plain = 1 - smoothstep(120, 560, Math.hypot(x, z));
    height = height * (1 - plain * 0.72) + 9 * plain * 0.72;

    // Vallée : creusement du lit de la rivière.
    const riverDistance = Math.abs(z - riverPath(x));
    const valley = 1 - smoothstep(0, 78, riverDistance);
    const bed = 1.2 + valueNoise(x / 45, 7.5) * 1.4;
    height = height * (1 - valley * 0.94) + bed * valley * 0.94;

    // Cuvette du lac.
    const lakeDistance = Math.hypot(x - PROCEDURAL_LAKE.x, z - PROCEDURAL_LAKE.z);
    const bowl = 2 + (lakeDistance / PROCEDURAL_LAKE.radius) * 8;
    const basin = 1 - smoothstep(PROCEDURAL_LAKE.radius * 0.9, PROCEDURAL_LAKE.radius * 1.7, lakeDistance);
    height = height * (1 - basin) + Math.min(height, bowl) * basin;

    return height;
}

/**
 * Relief procédural : collines, vallée, rivière et lac, générés sans réseau.
 * La projection est linéaire (les positions des entités restent estimées).
 */
export function createProceduralTileset(): TerrainTileset {
    const center = PROCEDURAL_CENTER;
    const metersPerDegreeLat = 111320;
    const metersPerDegreeLng = 111320 * Math.cos((center.lat * Math.PI) / 180);
    const worldSize = PROCEDURAL_SIZE;

    let minElevation = Infinity;
    let maxElevation = -Infinity;

    for (let row = 0; row <= 96; row += 1) {
        for (let column = 0; column <= 96; column += 1) {
            const x = (column / 96 - 0.5) * worldSize;
            const z = (row / 96 - 0.5) * worldSize;
            const height = proceduralHeight(x, z);
            if (height < minElevation) minElevation = height;
            if (height > maxElevation) maxElevation = height;
        }
    }

    const colorTexture = proceduralGroundTexture();
    colorTexture.repeat.set(Math.round(worldSize / 24), Math.round(worldSize / 24));

    const river: TerrainDecor['river'] = [];
    for (let x = -worldSize / 2; x <= worldSize / 2; x += 12) {
        const z = riverPath(x);
        river.push({
            x,
            z,
            y: PROCEDURAL_WATER_LEVEL,
            width: 12 + valueNoise(x / 70, 2.2) * 9,
        });
    }

    return {
        center,
        zoom: MIN_ZOOM,
        canvasSize: worldSize,
        metersPerPixel: worldSize / worldSize,
        worldSize,
        colorTexture,
        hasImagery: false,
        hasElevation: true,
        minElevation,
        maxElevation,
        project: (lat, lng) => ({
            x: (lng - center.lng) * metersPerDegreeLng,
            z: -(lat - center.lat) * metersPerDegreeLat,
        }),
        heightAt: proceduralHeight,
        decor: {
            river,
            lake: {
                x: PROCEDURAL_LAKE.x,
                z: PROCEDURAL_LAKE.z,
                radius: PROCEDURAL_LAKE.radius * 0.65,
                y: LAKE_WATER_LEVEL,
            },
        },
        dispose: () => colorTexture.dispose(),
    };
}

export const terrainDefaults = {
    defaultCenter: DEFAULT_CENTER,
    tileSize: TILE_SIZE,
    canvasSize: CANVAS_SIZE,
};
