import * as THREE from 'three';

import { gableRoofGeometry, heightAt, mulberry32 } from './core';

export function createHouse(
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    rotation: number,
    nightLights: THREE.MeshStandardMaterial[],
): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, heightAt(x, z), z);
    group.rotation.y = rotation;

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf0dfc2, roughness: 0.9 });
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x9e4435, roughness: 0.82, flatShading: true });
    const trimMaterial = new THREE.MeshStandardMaterial({ color: 0xf8f3e7, roughness: 0.8 });
    const glass = new THREE.MeshStandardMaterial({
        color: 0x26384d,
        roughness: 0.2,
        metalness: 0.3,
        emissive: 0xffc46b,
        emissiveIntensity: 0,
    });
    nightLights.push(glass);

    const walls = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMaterial);
    walls.position.y = height / 2;
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    const roof = new THREE.Mesh(gableRoofGeometry(width + 1.4, depth + 1.4, 4.6), roofMaterial);
    roof.position.y = height;
    roof.castShadow = true;
    group.add(roof);

    const chimney = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 3.2, 1.3),
        new THREE.MeshStandardMaterial({ color: 0x8b5d4a, roughness: 0.9 }),
    );
    chimney.position.set(width * 0.24, height + 3.8, depth * 0.16);
    chimney.castShadow = true;
    group.add(chimney);

    const door = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 3.4, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x6b4a31, roughness: 0.8 }),
    );
    door.position.set(0, 1.7, depth / 2 + 0.14);
    group.add(door);

    for (const offset of [-width * 0.31, width * 0.31]) {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(2.05, 2.05, 0.1), trimMaterial);
        frame.position.set(offset, height * 0.58, depth / 2 + 0.02);
        group.add(frame);

        const window = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 0.16), glass);
        window.position.set(offset, height * 0.58, depth / 2 + 0.1);
        group.add(window);
    }

    const step = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.35, 1.3), trimMaterial);
    step.position.set(0, 0.18, depth / 2 + 0.65);
    step.castShadow = true;
    group.add(step);

    return group;
}

export function createBarn(
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    rotation: number,
): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, heightAt(x, z), z);
    group.rotation.y = rotation;

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xa44837, roughness: 0.92 });
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x46515d, roughness: 0.82, flatShading: true });
    const trimMaterial = new THREE.MeshStandardMaterial({ color: 0xf4efe3, roughness: 0.85 });
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x663d2b, roughness: 0.9 });

    const walls = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMaterial);
    walls.position.y = height / 2;
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    const roof = new THREE.Mesh(gableRoofGeometry(width + 1.8, depth + 1.8, 5.6), roofMaterial);
    roof.position.y = height;
    roof.castShadow = true;
    group.add(roof);

    const door = new THREE.Mesh(new THREE.BoxGeometry(7.2, height * 0.76, 0.3), doorMaterial);
    door.position.set(0, (height * 0.76) / 2, depth / 2 + 0.16);
    group.add(door);

    for (const offset of [-width / 2 + 0.5, width / 2 - 0.5]) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.38, height, 0.38), trimMaterial);
        beam.position.set(offset, height / 2, depth / 2 + 0.08);
        group.add(beam);
    }

    const cross = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.32, 0.2), trimMaterial);
    cross.position.set(0, height * 0.38, depth / 2 + 0.36);
    cross.rotation.z = 0.7;
    group.add(cross);

    const crossB = cross.clone();
    crossB.rotation.z = -0.7;
    group.add(crossB);

    return group;
}

export function createSilo(x: number, z: number, radius: number, height: number, rotation: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, heightAt(x, z), z);
    group.rotation.y = rotation;

    const metal = new THREE.MeshStandardMaterial({ color: 0xb7c1ca, roughness: 0.38, metalness: 0.68 });
    const band = new THREE.MeshStandardMaterial({ color: 0x7b8792, roughness: 0.45, metalness: 0.6 });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 18), metal);
    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const dome = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        metal,
    );
    dome.position.y = height;
    dome.castShadow = true;
    group.add(dome);

    for (let y = 2; y < height; y += 3) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.04, 0.07, 5, 22), band);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = y;
        group.add(ring);
    }

    return group;
}

export function createWindmill(x: number, z: number): { group: THREE.Group; blades: THREE.Object3D } {
    const group = new THREE.Group();
    group.position.set(x, heightAt(x, z), z);

    const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 2.8, 15, 8),
        new THREE.MeshStandardMaterial({ color: 0xe6dcc4, roughness: 0.9 }),
    );
    tower.position.y = 7.5;
    tower.castShadow = true;
    group.add(tower);

    const cap = new THREE.Mesh(
        new THREE.ConeGeometry(2.1, 2.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x8b4c36, roughness: 0.85, flatShading: true }),
    );
    cap.position.y = 16.2;
    cap.castShadow = true;
    group.add(cap);

    const blades = new THREE.Group();
    blades.position.set(0, 16.1, 2);
    group.add(blades);

    const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0xf3ead6, roughness: 0.85 });
    const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.4, 0.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x5c4632 }),
    );
    hub.rotation.x = Math.PI / 2;
    blades.add(hub);

    for (let index = 0; index < 4; index += 1) {
        const pivot = new THREE.Group();
        pivot.rotation.z = (index / 4) * Math.PI * 2;
        blades.add(pivot);

        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7.4, 0.24), bladeMaterial);
        arm.position.y = 3.8;
        pivot.add(arm);

        const slat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.8, 0.16), bladeMaterial);
        slat.position.set(0.65, 4.4, 0.08);
        pivot.add(slat);
    }

    return { group, blades };
}

export function createHayBales(x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, heightAt(x, z), z);
    const random = mulberry32(515);
    const material = new THREE.MeshStandardMaterial({ color: 0xd2b25e, roughness: 1 });

    for (let index = 0; index < 8; index += 1) {
        const angle = random() * Math.PI * 2;
        const radius = random() * 10;
        const bale = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 1.8, 12), material);
        bale.rotation.z = Math.PI / 2;
        bale.position.set(Math.cos(angle) * radius, 1.05, Math.sin(angle) * radius);
        bale.castShadow = true;
        bale.receiveShadow = true;
        group.add(bale);
    }

    return group;
}

export function createWell(x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, heightAt(x, z), z);

    const stone = new THREE.MeshStandardMaterial({ color: 0x8f9188, roughness: 0.95 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x765039, roughness: 0.9 });

    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2, 1.6, 12, 1, true), stone);
    ring.position.y = 0.8;
    ring.castShadow = true;
    group.add(ring);

    const water = new THREE.Mesh(
        new THREE.CircleGeometry(1.5, 16),
        new THREE.MeshStandardMaterial({ color: 0x2f88b0, roughness: 0.2, metalness: 0.1 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 1.15;
    group.add(water);

    for (const side of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.5, 0.28), wood);
        post.position.set(side * 1.5, 2.1, 0);
        post.castShadow = true;
        group.add(post);
    }

    const roof = new THREE.Mesh(gableRoofGeometry(4.2, 3, 1.2), wood);
    roof.position.y = 3.8;
    roof.castShadow = true;
    group.add(roof);

    return group;
}

export function createCow(): THREE.Group {
    const group = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: 0xf1eadf, roughness: 0.95 });
    const black = new THREE.MeshStandardMaterial({ color: 0x33302d, roughness: 0.95 });
    const pink = new THREE.MeshStandardMaterial({ color: 0xd99a8b, roughness: 0.9 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.4, 1.25), white);
    body.position.y = 1.75;
    body.castShadow = true;
    group.add(body);

    const patchA = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.42, 1.27), black);
    patchA.position.set(-0.55, 1.75, 0);
    group.add(patchA);

    const patchB = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.42, 0.6), black);
    patchB.position.set(0.7, 1.75, 0.42);
    group.add(patchB);

    const head = new THREE.Mesh(new THREE.BoxGeometry(1, 1.05, 0.9), white);
    head.position.set(1.55, 2.2, 0);
    head.castShadow = true;
    group.add(head);

    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.62), pink);
    nose.position.set(2.04, 2.03, 0);
    group.add(nose);

    for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.5), black);
        ear.position.set(1.5, 2.75, side * 0.48);
        group.add(ear);

        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.45, 5), white);
        horn.position.set(1.55, 2.95, side * 0.28);
        group.add(horn);
    }

    for (const x of [-0.85, 0.85]) {
        for (const z of [-0.45, 0.45]) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.15, 0.3), white);
            leg.position.set(x, 0.6, z);
            leg.castShadow = true;
            group.add(leg);
        }
    }

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.12), black);
    tail.position.set(-1.35, 2.1, 0);
    group.add(tail);

    return group;
}

export function createTractor(
    nightLights: THREE.MeshStandardMaterial[],
): { group: THREE.Group; wheels: THREE.Object3D[] } {
    const group = new THREE.Group();
    const wheels: THREE.Object3D[] = [];

    const red = new THREE.MeshStandardMaterial({ color: 0xc9342c, roughness: 0.52, metalness: 0.15 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2c313a, roughness: 0.65, metalness: 0.35 });
    const glass = new THREE.MeshStandardMaterial({
        color: 0x9dd3e3,
        roughness: 0.18,
        metalness: 0.15,
        transparent: true,
        opacity: 0.72,
    });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x1d2126, roughness: 0.92 });
    const hubMaterial = new THREE.MeshStandardMaterial({ color: 0xd8b23c, roughness: 0.5, metalness: 0.35 });
    const light = new THREE.MeshStandardMaterial({
        color: 0xfff3b0,
        emissive: 0xffd36b,
        emissiveIntensity: 0.2,
        roughness: 0.3,
    });
    nightLights.push(light);

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.85, 6.6), dark);
    chassis.position.y = 1.45;
    chassis.castShadow = true;
    group.add(chassis);

    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.45, 3.1), red);
    hood.position.set(0, 2.25, 1.75);
    hood.castShadow = true;
    group.add(hood);

    const grille = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 0.16), dark);
    grille.position.set(0, 2.25, 3.35);
    group.add(grille);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(3, 2.1, 2.5), red);
    cabin.position.set(0, 3.2, -0.7);
    cabin.castShadow = true;
    group.add(cabin);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.35, 0.1), glass);
    windshield.position.set(0, 3.4, 0.56);
    group.add(windshield);

    const rearWindow = windshield.clone();
    rearWindow.position.z = -1.96;
    group.add(rearWindow);

    for (const side of [-1, 1]) {
        const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 1.5), glass);
        sideWindow.position.set(side * 1.46, 3.4, -0.65);
        group.add(sideWindow);
    }

    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.22, 2.75), red);
    roof.position.set(0, 4.33, -0.7);
    roof.castShadow = true;
    group.add(roof);

    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.4, 8), dark);
    exhaust.position.set(0.95, 3.35, 2.5);
    group.add(exhaust);

    for (const side of [-1, 1]) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.12), light);
        lamp.position.set(side * 0.95, 2.5, 3.43);
        group.add(lamp);
    }

    const rearGeometry = new THREE.CylinderGeometry(1.75, 1.75, 1.15, 18);
    rearGeometry.rotateZ(Math.PI / 2);
    const frontGeometry = new THREE.CylinderGeometry(1.08, 1.08, 0.82, 16);
    frontGeometry.rotateZ(Math.PI / 2);

    for (const side of [-1, 1]) {
        const rear = new THREE.Mesh(rearGeometry, rubber);
        rear.position.set(side * 1.75, 1.75, -1.8);
        rear.castShadow = true;
        group.add(rear);
        wheels.push(rear);

        const rearHub = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.22, 14), hubMaterial);
        rearHub.rotation.z = Math.PI / 2;
        rearHub.position.copy(rear.position);
        group.add(rearHub);

        const front = new THREE.Mesh(frontGeometry, rubber);
        front.position.set(side * 1.55, 1.1, 2.25);
        front.castShadow = true;
        group.add(front);
        wheels.push(front);

        const frontHub = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.89, 12), hubMaterial);
        frontHub.rotation.z = Math.PI / 2;
        frontHub.position.copy(front.position);
        group.add(frontHub);
    }

    return { group, wheels };
}

export function createFarmer(): {
    group: THREE.Group;
    legs: THREE.Object3D[];
    arms: THREE.Object3D[];
} {
    const group = new THREE.Group();
    const legs: THREE.Object3D[] = [];
    const arms: THREE.Object3D[] = [];

    const skin = new THREE.MeshStandardMaterial({ color: 0xc98d62, roughness: 0.9 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0x3d7f76, roughness: 0.9 });
    const overall = new THREE.MeshStandardMaterial({ color: 0x31556e, roughness: 0.9 });
    const hat = new THREE.MeshStandardMaterial({ color: 0xd9b764, roughness: 0.95 });
    const boot = new THREE.MeshStandardMaterial({ color: 0x3d3229, roughness: 0.95 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.5, 0.66), shirt);
    body.position.y = 2.55;
    body.castShadow = true;
    group.add(body);

    const bib = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.15, 0.06), overall);
    bib.position.set(0, 2.45, 0.36);
    group.add(bib);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 13, 10), skin);
    head.position.y = 3.73;
    head.castShadow = true;
    group.add(head);

    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.1, 16), hat);
    brim.position.y = 4.02;
    group.add(brim);

    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.56, 0.45, 14), hat);
    crown.position.y = 4.22;
    crown.castShadow = true;
    group.add(crown);

    for (const side of [-1, 1]) {
        const legPivot = new THREE.Group();
        legPivot.position.set(side * 0.3, 1.8, 0);
        group.add(legPivot);

        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.5, 0.42), overall);
        leg.position.y = -0.75;
        leg.castShadow = true;
        legPivot.add(leg);

        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.28, 0.62), boot);
        shoe.position.set(0, -1.54, 0.08);
        legPivot.add(shoe);
        legs.push(legPivot);

        const armPivot = new THREE.Group();
        armPivot.position.set(side * 0.72, 3.08, 0);
        group.add(armPivot);

        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.3, 0.34), shirt);
        arm.position.y = -0.62;
        arm.castShadow = true;
        armPivot.add(arm);

        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), skin);
        hand.position.y = -1.34;
        armPivot.add(hand);
        arms.push(armPivot);
    }

    return { group, legs, arms };
}
