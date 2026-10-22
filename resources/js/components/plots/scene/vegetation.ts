import * as THREE from 'three';

import type { QualityProfile } from './quality';

/**
 * Végétation instanciée : arbres et herbe placés sur le relief, animés par le
 * vent (déformation dans le vertex shader, aucun calcul CPU par frame).
 *
 * Les emplacements sont tirés d'une grille déterministe (même rendu d'un
 * chargement à l'autre) et évitent les parcelles, les points d'eau et les
 * pentes trop fortes.
 */
export type VegetationOptions = {
    scene: THREE.Scene;
    heightAt: (x: number, z: number) => number;
    worldSize: number;
    profile: QualityProfile;
    /** Zones à laisser libres : parcelles, réserves d'eau, plans d'eau. */
    exclude: Array<{ x: number; z: number; r: number }>;
};

function mulberry32(seed: number): () => number {
    let state = seed >>> 0;

    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Géométrie d'un brin d'herbe : deux plans croisés effilés, vertex colorés. */
function bladeGeometry(): THREE.BufferGeometry {
    const height = 1;
    const halfWidth = 0.07;

    const blade: Array<[number, number, number]> = [
        [-halfWidth, 0, 0],
        [halfWidth, 0, 0],
        [-halfWidth * 0.66, height * 0.55, 0],
        [halfWidth * 0.66, height * 0.55, 0],
        [0, height, 0],
    ];

    const indices = [0, 1, 3, 0, 3, 2, 2, 3, 4];

    const positions: number[] = [];
    const colors: number[] = [];
    const push = (vertices: Array<[number, number, number]>, rotate: boolean) => {
        const base = positions.length / 3;

        vertices.forEach(([x, y, z]) => {
            positions.push(rotate ? z : x, y, rotate ? x : z);

            const shade = 0.35 + (y / height) * 0.65;
            colors.push(shade * 0.42, shade, shade * 0.32);
        });

        indices.forEach((index) => indexList.push(base + index));
    };

    const indexList: number[] = [];
    push(blade, false);
    push(blade, true);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indexList);

    return geometry;
}

export class Vegetation {
    private readonly options: VegetationOptions;

    private readonly group = new THREE.Group();

    private readonly uniforms = {
        uTime: { value: 0 },
        uWind: { value: 0.4 },
    };

    private meshes: THREE.Object3D[] = [];

    private materials: THREE.Material[] = [];

    private geometries: THREE.BufferGeometry[] = [];

    constructor(options: VegetationOptions) {
        this.options = options;
        this.group.name = 'vegetation';
        options.scene.add(this.group);
        this.build(options.profile);
    }

    setQuality(profile: QualityProfile): void {
        this.clear();
        this.build(profile);
    }

    update(delta: number, wind: number, rain: number): void {
        this.uniforms.uTime.value += delta;
        this.uniforms.uWind.value = wind * (1 + rain * 0.35);
    }

    dispose(): void {
        this.clear();
        this.options.scene.remove(this.group);
    }

    private clear(): void {
        this.meshes.forEach((mesh) => this.group.remove(mesh));
        this.meshes = [];
        this.geometries.forEach((geometry) => geometry.dispose());
        this.geometries = [];
        this.materials.forEach((material) => material.dispose());
        this.materials = [];
    }

    /** Déformation du vent injectée dans le shader standard de three. */
    private applyWind(material: THREE.MeshStandardMaterial, amplitude: number): void {
        material.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = this.uniforms.uTime;
            shader.uniforms.uWind = this.uniforms.uWind;
            shader.uniforms.uAmplitude = { value: amplitude };

            shader.vertexShader = `uniform float uTime;\nuniform float uWind;\nuniform float uAmplitude;\n${shader.vertexShader}`;

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                #ifdef USE_INSTANCING
                    vec3 windAnchor = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
                #else
                    vec3 windAnchor = vec3(0.0);
                #endif
                float windHeight = pow(max(transformed.y, 0.0), 1.5);
                float windPhase = uTime * 1.7 + windAnchor.x * 0.14 + windAnchor.z * 0.11;
                float windSway = windHeight * uWind * uAmplitude;
                transformed.x += (sin(windPhase) * 0.62 + sin(windPhase * 2.7) * 0.24) * windSway;
                transformed.z += (cos(windPhase * 0.83) * 0.45 + sin(windPhase * 1.9) * 0.18) * windSway;`,
            );
        };
        material.customProgramCacheKey = () => `wind-${amplitude}`;
    }

    private isFree(x: number, z: number): boolean {
        return !this.options.exclude.some((zone) => (x - zone.x) ** 2 + (z - zone.z) ** 2 < zone.r ** 2);
    }

    private slopeAt(x: number, z: number): number {
        const step = 3;
        const dx = (this.options.heightAt(x + step, z) - this.options.heightAt(x - step, z)) / (2 * step);
        const dz = (this.options.heightAt(x, z + step) - this.options.heightAt(x, z - step)) / (2 * step);
        return Math.hypot(dx, dz);
    }

    private scatter(count: number, random: () => number, slopeLimit: number): Array<{ x: number; z: number }> {
        const worldSize = this.options.worldSize;
        const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
        const cell = worldSize / columns;
        const points: Array<{ x: number; z: number }> = [];

        for (let row = 0; row < columns && points.length < count; row += 1) {
            for (let column = 0; column < columns && points.length < count; column += 1) {
                const x = -worldSize / 2 + (column + 0.15 + random() * 0.7) * cell;
                const z = -worldSize / 2 + (row + 0.15 + random() * 0.7) * cell;

                if (!this.isFree(x, z)) continue;
                if (this.slopeAt(x, z) > slopeLimit) continue;

                points.push({ x, z });
            }
        }

        return points;
    }

    private build(profile: QualityProfile): void {
        const { heightAt } = this.options;
        const random = mulberry32(0x5eed17);

        // --- Arbres -----------------------------------------------------
        const trees = this.scatter(profile.treeCount, random, 1.05);

        const trunkGeometry = new THREE.CylinderGeometry(0.16, 0.34, 1, 6);
        trunkGeometry.translate(0, 0.5, 0);
        const canopyGeometry = new THREE.ConeGeometry(1, 1, 7);
        canopyGeometry.translate(0, 0.5, 0);

        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x6b4f34, roughness: 0.95 });
        const canopyMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });

        this.applyWind(trunkMaterial, 0.035);
        this.applyWind(canopyMaterial, 0.055);

        const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, Math.max(trees.length, 1));
        const canopies = new THREE.InstancedMesh(canopyGeometry, canopyMaterial, Math.max(trees.length, 1));

        const matrix = new THREE.Matrix4();
        const quaternion = new THREE.Quaternion();
        const position = new THREE.Vector3();
        const scale = new THREE.Vector3();
        const canopyColor = new THREE.Color();

        trees.forEach((tree, index) => {
            const base = heightAt(tree.x, tree.z);
            const height = 4.5 + random() * 7.5;
            const radius = 1.5 + random() * 1.9;
            const rotation = random() * Math.PI * 2;

            position.set(tree.x, base, tree.z);
            quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
            scale.set(1, height * 0.42, 1);
            matrix.compose(position, quaternion, scale);
            trunks.setMatrixAt(index, matrix);

            position.set(tree.x, base + height * 0.3, tree.z);
            scale.set(radius, height * 0.78, radius);
            matrix.compose(position, quaternion, scale);
            canopies.setMatrixAt(index, matrix);

            canopyColor.setHSL(0.26 + random() * 0.08, 0.42 + random() * 0.2, 0.24 + random() * 0.14);
            canopies.setColorAt(index, canopyColor);
        });

        trunks.count = trees.length;
        canopies.count = trees.length;
        trunks.instanceMatrix.needsUpdate = true;
        canopies.instanceMatrix.needsUpdate = true;
        if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true;

        trunks.castShadow = profile.shadows;
        canopies.castShadow = profile.shadows;
        trunks.receiveShadow = false;
        canopies.receiveShadow = false;

        this.group.add(trunks, canopies);
        this.meshes.push(trunks, canopies);
        this.geometries.push(trunkGeometry, canopyGeometry);
        this.materials.push(trunkMaterial, canopyMaterial);

        // --- Herbe ------------------------------------------------------
        if (profile.grassCount > 0) {
            const grassGeometry = bladeGeometry();
            const grassMaterial = new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: 0.95,
                side: THREE.DoubleSide,
            });
            this.applyWind(grassMaterial, 0.16);

            const blades = this.scatter(profile.grassCount, random, 1.4);
            const grass = new THREE.InstancedMesh(grassGeometry, grassMaterial, Math.max(blades.length, 1));

            blades.forEach((blade, index) => {
                position.set(blade.x, heightAt(blade.x, blade.z) - 0.04, blade.z);
                quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), random() * Math.PI * 2);
                const size = 0.5 + random() * 0.75;
                scale.set(size, size * (0.7 + random() * 0.7), size);
                matrix.compose(position, quaternion, scale);
                grass.setMatrixAt(index, matrix);
            });

            grass.count = blades.length;
            grass.instanceMatrix.needsUpdate = true;
            grass.castShadow = false;
            grass.receiveShadow = false;
            grass.frustumCulled = false;

            this.group.add(grass);
            this.meshes.push(grass);
            this.geometries.push(grassGeometry);
            this.materials.push(grassMaterial);
        }
    }
}
