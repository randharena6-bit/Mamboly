import * as THREE from 'three';

import type { TerrainDecor } from '../terrain';

/**
 * Surfaces d'eau animées : cuve des points d'eau, étendues de type bassin ou
 * rivière, et décor procédural (rivière + lac) quand aucune coordonnée n'existe.
 *
 * Le mouvement est entièrement shader (aucune géométrie recalculée par frame),
 * avec une réponse à la pluie et à la luminosité du cycle jour/nuit.
 */
export type WaterSourceVisual = {
    id: string | number;
    x: number;
    z: number;
    /** Surface haute de la réserve (monde). */
    y: number;
    radius: number;
    /** Un plan d'eau au sol plutôt qu'une cuve fermée. */
    pond: boolean;
};

type WaterOptions = {
    scene: THREE.Scene;
    sources: WaterSourceVisual[];
    decor?: TerrainDecor;
    heightAt: (x: number, z: number) => number;
    worldSize: number;
};

const POND_TYPES = new Set(['bassin', 'reservoir', 'riviere', 'canal']);

export function isPondType(type: unknown): boolean {
    return POND_TYPES.has(String(type ?? ''));
}

function createMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        uniforms: {
            uTime: { value: 0 },
            uRain: { value: 0 },
            uDaylight: { value: 1 },
        },
        vertexShader: /* glsl */ `
            uniform float uTime;
            uniform float uRain;
            varying vec2 vLocal;
            varying float vWave;

            void main() {
                vec3 point = position;
                float amplitude = 0.14 * (1.0 + uRain * 2.2);
                float wave = sin(point.x * 0.32 + uTime * 1.5) * cos(point.z * 0.27 - uTime * 1.1);
                point.y += wave * amplitude;
                vWave = wave;
                vLocal = point.xz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 1.0);
            }
        `,
        fragmentShader: /* glsl */ `
            uniform float uTime;
            uniform float uRain;
            uniform float uDaylight;
            varying vec2 vLocal;
            varying float vWave;

            void main() {
                vec3 deep = vec3(0.02, 0.13, 0.22);
                vec3 shallow = vec3(0.10, 0.40, 0.52);

                float shimmer = 0.5 + 0.5 * vWave;
                vec3 color = mix(deep, shallow, shimmer);

                float glint = pow(max(vWave, 0.0), 5.0) * (0.35 + uRain * 0.25);
                float rainRing = sin(length(vLocal) * 0.55 - uTime * 5.5) * uRain;

                color += glint * vec3(0.55, 0.68, 0.75);
                color += rainRing * 0.045;
                color *= 0.22 + 0.78 * uDaylight;

                gl_FragColor = vec4(color, 0.93);
            }
        `,
    });
}

function riverGeometry(river: TerrainDecor['river']): THREE.BufferGeometry {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    river.forEach((point, index) => {
        const previous = river[Math.max(index - 1, 0)];
        const next = river[Math.min(index + 1, river.length - 1)];
        const direction = new THREE.Vector2(next.x - previous.x, next.z - previous.z).normalize();
        const perpendicular = new THREE.Vector2(-direction.y, direction.x);
        const half = point.width / 2;

        positions.push(
            point.x + perpendicular.x * half,
            point.y,
            point.z + perpendicular.y * half,
            point.x - perpendicular.x * half,
            point.y,
            point.z - perpendicular.y * half,
        );
        uvs.push(0, index / river.length, 1, index / river.length);

        if (index < river.length - 1) {
            const base = index * 2;
            indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
        }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
}

export class WaterSurfaces {
    private readonly group = new THREE.Group();

    private readonly material = createMaterial();

    private readonly geometries: THREE.BufferGeometry[] = [];

    private readonly options: WaterOptions;

    constructor(options: WaterOptions) {
        this.options = options;
        this.group.name = 'water-surfaces';
        options.scene.add(this.group);

        options.sources.forEach((source) => {
            if (source.pond) {
                this.addDisc(source.x, source.z, source.y, source.radius * 2.3);
            } else {
                this.addDisc(source.x, source.z, source.y - 0.35, source.radius * 0.92);
            }
        });

        const { decor } = options;
        if (decor?.river.length) {
            const geometry = riverGeometry(decor.river);
            const mesh = new THREE.Mesh(geometry, this.material);
            mesh.renderOrder = 2;
            this.geometries.push(geometry);
            this.group.add(mesh);
        }

        if (decor?.lake) {
            this.addDisc(decor.lake.x, decor.lake.z, decor.lake.y, decor.lake.radius);
        }
    }

    set visible(value: boolean) {
        this.group.visible = value;
    }

    update(delta: number, rain: number, daylight: number): void {
        this.material.uniforms.uTime.value += delta;
        this.material.uniforms.uRain.value = rain;
        this.material.uniforms.uDaylight.value = daylight;
    }

    dispose(): void {
        this.options.scene.remove(this.group);
        this.geometries.forEach((geometry) => geometry.dispose());
        this.group.children.forEach((child) => {
            if (child instanceof THREE.Mesh && !this.geometries.includes(child.geometry)) {
                child.geometry.dispose();
            }
        });
        this.material.dispose();
    }

    private addDisc(x: number, z: number, y: number, radius: number): void {
        const geometry = new THREE.CircleGeometry(radius, 40);
        geometry.rotateX(-Math.PI / 2);

        const mesh = new THREE.Mesh(geometry, this.material);
        mesh.position.set(x, y, z);
        mesh.renderOrder = 2;

        this.geometries.push(geometry);
        this.group.add(mesh);
    }
}
