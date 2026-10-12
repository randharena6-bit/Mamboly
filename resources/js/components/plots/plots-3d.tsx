import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import type { ResourceRow } from '../../resources/types';

export type Plots3DProps = {
    rows: ResourceRow[];
    waterSources: ResourceRow[];
};

const STATUS_COLORS: Record<string, number> = {
    disponible: 0x22c55e,
    en_culture: 0x3b82f6,
    en_repos: 0xf59e0b,
    indisponible: 0xef4444,
};

const num = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

/** Hauteur du bloc : reflète la priorité d'irrigation (humidité basse = urgent). */
function heightFor(row: ResourceRow): number {
    const moisture = row.soil_moisture === null || row.soil_moisture === undefined ? 50 : num(row.soil_moisture, 50);
    const urgency = 1 - Math.min(Math.max(moisture, 0), 100) / 100;
    const priority = { faible: 0.2, normale: 0.45, elevee: 0.75, critique: 1 }[String(row.manual_priority)] ?? 0.45;

    return 0.4 + urgency * 1.2 + priority * 0.6;
}

function labelSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);

    if (ctx) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 34px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text.slice(0, 14), canvas.width / 2, canvas.height / 2);
        texture.needsUpdate = true;
    }

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
    sprite.scale.set(1.4, 0.35, 1);

    return sprite;
}

export function Plots3D({ rows, waterSources }: Plots3DProps) {
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const host = container.current;
        if (!host) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f5f4);

        const camera = new THREE.PerspectiveCamera(50, host.clientWidth / host.clientHeight, 0.1, 200);
        camera.position.set(14, 12, 16);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(host.clientWidth, host.clientHeight);
        renderer.shadowMap.enabled = true;
        host.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(5, 0, 3);

        scene.add(new THREE.AmbientLight(0xffffff, 0.75));
        const sun = new THREE.DirectionalLight(0xffffff, 1.1);
        sun.position.set(14, 20, 12);
        sun.castShadow = true;
        scene.add(sun);

        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(40, 40),
            new THREE.MeshStandardMaterial({ color: 0xe7e5e4 }),
        );
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        const world = new THREE.Group();
        scene.add(world);

        const disposables: Array<{ dispose: () => void }> = [];

        const plots = rows.slice(0, 24);
        plots.forEach((row, index) => {
            const height = heightFor(row);
            const color = STATUS_COLORS[String(row.status)] ?? 0x64748b;
            const geometry = new THREE.BoxGeometry(1.7, height, 1.7);
            const material = new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: 0.12,
                roughness: 0.65,
            });
            disposables.push(geometry, material);

            const mesh = new THREE.Mesh(geometry, material);
            const x = (index % 6) * 2.1;
            const z = Math.floor(index / 6) * 2.1;
            mesh.position.set(x, height / 2, z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            world.add(mesh);

            const sprite = labelSprite(String(row.code ?? row.name ?? ''));
            sprite.position.set(x, height + 0.6, z);
            world.add(sprite);
        });

        const waterSourcesShown = waterSources.slice(0, 12);
        waterSourcesShown.forEach((source, index) => {
            const ratio = Math.min(num(source.available_quantity, 0) / Math.max(num(source.capacity, 1), 1), 1);
            const radius = 0.5;
            const fill = Math.max(0.25, ratio) * 1.8;
            const geometry = new THREE.CylinderGeometry(radius, radius, fill, 20);
            const material = new THREE.MeshStandardMaterial({
                color: 0x60a5fa,
                transparent: true,
                opacity: 0.72,
                roughness: 0.3,
            });
            disposables.push(geometry, material);

            const tank = new THREE.Mesh(geometry, material);
            const x = (index % 4) * 3 + 11;
            const z = Math.floor(index / 4) * 3 - 4;
            tank.position.set(x, fill / 2, z);
            tank.castShadow = true;
            world.add(tank);

            const sprite = labelSprite(String(source.name ?? ''));
            sprite.position.set(x, fill + 0.5, z);
            world.add(sprite);
        });

        let frame = 0;
        const animate = () => {
            frame = requestAnimationFrame(animate);
            world.rotation.y = Math.sin(performance.now() * 0.00008) * 0.15;
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        const observer = new ResizeObserver(() => {
            if (host.clientWidth === 0 || host.clientHeight === 0) return;
            camera.aspect = host.clientWidth / host.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(host.clientWidth, host.clientHeight);
        });
        observer.observe(host);

        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            controls.dispose();
            disposables.forEach((item) => item.dispose());
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, [rows, waterSources]);

    return (
        <div className="space-y-3">
            <p className="text-sm text-ink-500">
                Chaque bloc représente une parcelle : la hauteur traduit la priorité d’irrigation, la couleur le
                statut. Les cylindres bleus figurent les ressources en eau (niveau de remplissage).
            </p>
            <div ref={container} className="h-[560px] w-full overflow-hidden rounded-2xl border border-ink-100" />
        </div>
    );
}
