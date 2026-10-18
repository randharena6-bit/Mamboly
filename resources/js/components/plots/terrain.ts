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
    dispose: () => void;
};

function clampZoom(zoom: number): number {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom)));
}

function loadTile(url: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';

        const timer = window.setTimeout(() => {
            image.onload = null;
            image.onerror = null;
            resolve(null);
        }, 12000);

        image.onload = () => {
            window.clearTimeout(timer);
            resolve(image);
        };

        image.onerror = () => {
            window.clearTimeout(timer);
            resolve(null);
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
        colorTexture = new THREE.Texture();
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

        return heights[py * CANVAS_SIZE + px];
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

/** Texture procédurale herbeuse, utilisée si l'imagerie satellite est indisponible. */
export function proceduralGroundTexture(): THREE.Texture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#4b7a3a';
        ctx.fillRect(0, 0, size, size);

        const palette = ['#446f34', '#568a41', '#3f6a30', '#5f9349', '#4a7c39'];

        for (let index = 0; index < 4200; index += 1) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const radius = 1 + Math.random() * 3;
            ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)];
            ctx.globalAlpha = 0.35 + Math.random() * 0.4;
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
    texture.repeat.set(24, 24);
    texture.needsUpdate = true;

    return texture;
}

export const terrainDefaults = {
    defaultCenter: DEFAULT_CENTER,
    tileSize: TILE_SIZE,
    canvasSize: CANVAS_SIZE,
};
