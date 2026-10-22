import * as THREE from 'three';

import type { DayNightCycle } from './day-night';
import type { QualityProfile } from './quality';

/**
 * Météo dynamique : nuages, pluie, brouillard, luminosité, sol humide et vent.
 *
 * La météo est une simulation interne (aucune API externe n'est appelée) : elle
 * modifie visuellement le relief, la végétation et l'eau.
 */
export type WeatherId = 'clair' | 'nuageux' | 'pluie' | 'brouillard';

export type WeatherOption = {
    id: WeatherId;
    label: string;
    description: string;
};

export const WEATHERS: WeatherOption[] = [
    { id: 'clair', label: 'Clair', description: 'Ciel dégagé, ombres nettes.' },
    { id: 'nuageux', label: 'Nuageux', description: 'Ciel voilé, lumière tamisée.' },
    { id: 'pluie', label: 'Pluie', description: 'Sol humide, vent marqué, visibilité réduite.' },
    { id: 'brouillard', label: 'Brouillard', description: 'Brume dense, visibilité courte.' },
];

type WeatherParams = {
    cloud: number;
    rain: number;
    fogFactor: number;
    light: number;
    wet: number;
    wind: number;
};

const PRESETS: Record<WeatherId, WeatherParams> = {
    clair: { cloud: 0.06, rain: 0, fogFactor: 1, light: 1, wet: 0, wind: 0.35 },
    nuageux: { cloud: 0.5, rain: 0, fogFactor: 0.78, light: 0.72, wet: 0.08, wind: 0.6 },
    pluie: { cloud: 0.86, rain: 1, fogFactor: 0.5, light: 0.42, wet: 1, wind: 0.95 },
    brouillard: { cloud: 0.3, rain: 0, fogFactor: 0.3, light: 0.7, wet: 0.25, wind: 0.12 },
};

type WeatherOptions = {
    scene: THREE.Scene;
    fog: THREE.Fog;
    sun: THREE.DirectionalLight;
    hemi: THREE.HemisphereLight;
    terrainMaterial: THREE.MeshStandardMaterial;
    worldSize: number;
    profile: QualityProfile;
};

function cloudTexture(): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.clearRect(0, 0, size, size);

        for (let index = 0; index < 90; index += 1) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const radius = 24 + Math.random() * 96;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, 'rgba(255,255,255,0.62)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;

    return texture;
}

export class WeatherSystem {
    current: WeatherId = 'clair';

    private readonly options: WeatherOptions;

    private profile: QualityProfile;

    private readonly params: WeatherParams = { ...PRESETS.clair };

    private readonly targets: WeatherParams = { ...PRESETS.clair };

    private readonly clouds: THREE.Mesh;

    private readonly cloudMaterial: THREE.MeshBasicMaterial;

    private readonly rain: THREE.Points;

    private readonly rainMaterial: THREE.PointsMaterial;

    private readonly rainPositions: Float32Array;

    private readonly rainBox: number;

    private readonly baseTerrainColor = new THREE.Color(0xffffff);

    private dryRoughness = 0.88;

    constructor(options: WeatherOptions) {
        this.options = options;
        this.profile = options.profile;

        const { scene, worldSize } = options;

        this.cloudMaterial = new THREE.MeshBasicMaterial({
            map: cloudTexture(),
            transparent: true,
            opacity: 0,
            depthWrite: false,
            fog: false,
            side: THREE.DoubleSide,
        });

        this.clouds = new THREE.Mesh(
            new THREE.PlaneGeometry(worldSize * 4, worldSize * 4),
            this.cloudMaterial,
        );
        this.clouds.rotation.x = -Math.PI / 2;
        this.clouds.position.y = worldSize * 0.55;
        this.clouds.renderOrder = -1;
        scene.add(this.clouds);

        this.rainBox = Math.max(worldSize * 0.5, 320);
        this.rainPositions = new Float32Array(this.profile.rainCount * 3);
        this.seedRain(this.profile.rainCount);

        const rainGeometry = new THREE.BufferGeometry();
        rainGeometry.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));

        this.rainMaterial = new THREE.PointsMaterial({
            color: 0xc6dcff,
            size: Math.max(this.rainBox * 0.004, 1.2),
            transparent: true,
            opacity: 0,
            depthWrite: false,
            sizeAttenuation: true,
        });

        this.rain = new THREE.Points(rainGeometry, this.rainMaterial);
        this.rain.frustumCulled = false;
        scene.add(this.rain);
    }

    get wind(): number {
        return this.params.wind;
    }

    get rainIntensity(): number {
        return this.params.rain;
    }

    setWeather(id: WeatherId): void {
        this.current = id;
        Object.assign(this.targets, PRESETS[id]);
    }

    setQuality(profile: QualityProfile): void {
        this.profile = profile;
        this.resizeRain(profile.rainCount);
    }

    /**
     * Applique la météo après `DayNightCycle.apply()` : la couleur du brouillard
     * reste celle du cycle solaire, seule la densité et la lumière changent.
     */
    update(delta: number, camera: THREE.Camera, dayNight: DayNightCycle): void {
        const { fog, sun, hemi, terrainMaterial, worldSize, profile } = this.options;
        const blend = 1 - Math.exp(-delta * 1.2);

        (Object.keys(this.params) as Array<keyof WeatherParams>).forEach((key) => {
            this.params[key] += (this.targets[key] - this.params[key]) * blend;
        });

        const daylight = dayNight.daylight();

        // Brouillard
        fog.near = Math.max(worldSize * 0.9 * this.params.fogFactor * 0.4, worldSize * 0.05);
        fog.far = worldSize * profile.fogFarFactor * this.params.fogFactor;

        // Luminosité
        sun.intensity = dayNight.sunBaseIntensity * this.params.light;
        hemi.intensity = dayNight.hemiBaseIntensity * (0.55 + 0.45 * this.params.light);

        // Nuages
        this.cloudMaterial.opacity = this.params.cloud * (0.35 + daylight * 0.65);
        this.cloudMaterial.color.setRGB(0.55, 0.58, 0.62).lerp(new THREE.Color(0xffffff), daylight);
        this.clouds.position.x = camera.position.x;
        this.clouds.position.z = camera.position.z;
        const map = this.cloudMaterial.map;
        if (map) {
            map.offset.x = (map.offset.x + delta * 0.004 * (0.4 + this.params.wind)) % 1;
        }

        // Pluie
        this.updateRain(delta, camera);

        // Sol humide
        const wet = this.params.wet;
        terrainMaterial.roughness = this.dryRoughness - wet * 0.5;
        terrainMaterial.color
            .copy(this.baseTerrainColor)
            .multiplyScalar(1 - wet * 0.26);
        terrainMaterial.metalness = wet * 0.08;
    }

    private seedRain(count: number): void {
        for (let index = 0; index < count; index += 1) {
            const offset = index * 3;
            this.rainPositions[offset] = (Math.random() - 0.5) * this.rainBox;
            this.rainPositions[offset + 1] = (Math.random() - 0.5) * this.rainBox;
            this.rainPositions[offset + 2] = (Math.random() - 0.5) * this.rainBox;
        }
    }

    private resizeRain(count: number): void {
        const geometry = this.rain.geometry;
        const positions = new Float32Array(count * 3);

        for (let index = 0; index < count; index += 1) {
            const offset = index * 3;
            positions[offset] = (Math.random() - 0.5) * this.rainBox;
            positions[offset + 1] = (Math.random() - 0.5) * this.rainBox;
            positions[offset + 2] = (Math.random() - 0.5) * this.rainBox;
        }

        this.rainPositions.set(positions);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setDrawRange(0, count);
        geometry.computeBoundingSphere();
    }

    private updateRain(delta: number, camera: THREE.Camera): void {
        const intensity = this.params.rain;
        this.rainMaterial.opacity = intensity * 0.55;
        this.rain.visible = intensity > 0.02;

        if (!this.rain.visible) return;

        const attribute = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
        const array = attribute.array as Float32Array;
        const fall = this.rainBox * 0.9 * delta;
        const half = this.rainBox / 2;

        for (let index = 1; index < array.length; index += 3) {
            array[index] -= fall;
            if (array[index] < -half) array[index] += this.rainBox;
        }

        attribute.needsUpdate = true;
        this.rain.position.set(camera.position.x, camera.position.y, camera.position.z);
    }

    dispose(): void {
        const { scene, terrainMaterial } = this.options;

        scene.remove(this.clouds, this.rain);
        this.clouds.geometry.dispose();
        this.cloudMaterial.map?.dispose();
        this.cloudMaterial.dispose();
        this.rain.geometry.dispose();
        this.rainMaterial.dispose();

        terrainMaterial.color.copy(this.baseTerrainColor);
        terrainMaterial.roughness = this.dryRoughness;
        terrainMaterial.metalness = 0;
    }
}
