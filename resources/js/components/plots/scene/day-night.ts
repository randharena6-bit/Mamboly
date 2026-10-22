import * as THREE from 'three';
import type { Sky } from 'three/examples/jsm/objects/Sky.js';

/**
 * Cycle jour et nuit : position du soleil, teintes du ciel, intensité des
 * lumières, couleur du brouillard et lueur lunaire.
 *
 * L'horloge est purement visuelle : elle ne touche à aucune date enregistrée
 * dans la base de données.
 */
export type DayLengthOption = {
    id: string;
    label: string;
    /** Durée d'une journée virtuelle, en secondes réelles. */
    seconds: number;
};

export const DAY_LENGTHS: DayLengthOption[] = [
    { id: '1min', label: '1 min', seconds: 60 },
    { id: '10min', label: '10 min', seconds: 600 },
    { id: '1h', label: '1 h', seconds: 3600 },
    { id: '6h', label: '6 h', seconds: 21600 },
];

type CycleOptions = {
    sky: Sky;
    sun: THREE.DirectionalLight;
    moon: THREE.DirectionalLight;
    hemi: THREE.HemisphereLight;
    fog: THREE.Fog;
    renderer: THREE.WebGLRenderer;
    worldSize: number;
};

export class DayNightCycle {
    hour = 14;

    playing = false;

    dayLengthSeconds = 600;

    /** Intensité du soleil avant modulation météo. */
    sunBaseIntensity = 3;

    /** Intensité de la lumière ambiante avant modulation météo. */
    hemiBaseIntensity = 0.75;

    /** Direction unitaire du soleil, relue par les shaders d'eau. */
    readonly sunDirection = new THREE.Vector3(0, 1, 0);

    private readonly options: CycleOptions;

    private readonly skyMaterial: THREE.ShaderMaterial;

    private readonly daylightColor = new THREE.Color(0xbfd8ea);

    private readonly nightColor = new THREE.Color(0x0b1220);

    constructor(options: CycleOptions) {
        this.options = options;
        this.skyMaterial = options.sky.material as THREE.ShaderMaterial;
        this.apply();
    }

    setHour(value: number): void {
        this.hour = ((value % 24) + 24) % 24;
        this.apply();
    }

    setPlaying(playing: boolean): void {
        this.playing = playing;
    }

    setDayLength(seconds: number): void {
        this.dayLengthSeconds = Math.max(1, seconds);
    }

    /** Fait avancer l'horloge virtuelle. */
    update(delta: number): void {
        if (!this.playing) return;

        this.setHour(this.hour + (delta * 24) / this.dayLengthSeconds);
    }

    /** 0 (nuit complète) → 1 (plein jour). */
    daylight(): number {
        const { elevation } = this.angles();
        return THREE.MathUtils.clamp(Math.sin(THREE.MathUtils.degToRad(Math.max(elevation, 0))), 0, 1);
    }

    private angles(): { elevation: number; azimuth: number } {
        const t = (this.hour - 6) / 12;
        const elevation = Math.sin(THREE.MathUtils.clamp(t, 0, 1) * Math.PI) * 68 - 4;
        const azimuth = 95 + t * 170;

        return { elevation, azimuth };
    }

    apply(): void {
        const { sun, moon, hemi, fog, renderer, worldSize } = this.options;
        const { elevation, azimuth } = this.angles();

        const phi = THREE.MathUtils.degToRad(90 - elevation);
        const theta = THREE.MathUtils.degToRad(azimuth);
        this.sunDirection.setFromSphericalCoords(1, phi, theta);

        this.skyMaterial.uniforms.sunPosition.value.copy(this.sunDirection);

        const daylight = this.daylight();
        const dusk = 1 - daylight;

        sun.position.copy(this.sunDirection).multiplyScalar(worldSize * 2);
        sun.target.position.set(0, 0, 0);

        const warm = new THREE.Color(0xffb066);
        const noon = new THREE.Color(0xfff4e6);
        sun.color.copy(warm).lerp(noon, daylight);
        this.sunBaseIntensity = 0.1 + daylight * 3.1;
        sun.intensity = this.sunBaseIntensity;

        hemi.intensity = 0.12 + daylight * 0.75;
        this.hemiBaseIntensity = hemi.intensity;
        hemi.color.set(0xbfd8ea).lerp(new THREE.Color(0x24344d), dusk);

        // Lueur lunaire : éclaire faiblement la scène quand le soleil est couché.
        moon.position.set(-this.sunDirection.x, 0.6, -this.sunDirection.z)
            .normalize()
            .multiplyScalar(worldSize * 2);
        moon.intensity = dusk * 0.35;

        fog.color.copy(this.nightColor).lerp(this.daylightColor, daylight);
        fog.near = worldSize * 0.9;
        fog.far = worldSize * 3.2;
        renderer.setClearColor(fog.color);
    }

    /** Couleur de brouillard courante, réutilisée par la météo. */
    fogColor(): THREE.Color {
        return this.options.fog.color;
    }
}
