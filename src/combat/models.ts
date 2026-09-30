import * as THREE from 'three';
import { ModelKind } from '../engine/enemies';

// 低多邊形恐龍模型：所有模型都朝向 +Z，腳底位於 y = 0

export interface DinoRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  jaw: THREE.Group;
  tail: THREE.Group[];
  legs: THREE.Group[];
  eyes: THREE.Mesh[];
  materials: THREE.MeshStandardMaterial[];
  height: number;
}

interface Palette {
  main: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
  belly: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  eye: THREE.MeshStandardMaterial;
  horn: THREE.MeshStandardMaterial;
}

function mat(color: number, emissive = 0x000000): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, emissive, roughness: 0.85, metalness: 0.05, flatShading: true });
}

function makePalette(color: number, accent: number): Palette {
  const c = new THREE.Color(color);
  const belly = c.clone().lerp(new THREE.Color(0xf2e6c8), 0.45);
  const dark = c.clone().multiplyScalar(0.55);
  return {
    main: mat(color),
    accent: mat(accent),
    belly: mat(belly.getHex()),
    dark: mat(dark.getHex()),
    eye: mat(0x111111, 0x000000),
    horn: mat(0xe8dcc0),
  };
}

function box(
  parent: THREE.Object3D, m: THREE.Material,
  w: number, h: number, d: number,
  x = 0, y = 0, z = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function cone(
  parent: THREE.Object3D, m: THREE.Material,
  r: number, h: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, seg = 5,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), m);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function pivot(parent: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

function tailChain(
  parent: THREE.Object3D, m: THREE.Material, start: THREE.Vector3,
  sizes: [number, number, number][],
): THREE.Group[] {
  const segs: THREE.Group[] = [];
  let p: THREE.Object3D = parent;
  let pos = start.clone();
  for (const [w, h, d] of sizes) {
    const g = pivot(p, pos.x, pos.y, pos.z);
    box(g, m, w, h, d, 0, 0, -d / 2);
    segs.push(g);
    p = g;
    pos = new THREE.Vector3(0, 0, -d * 0.95);
  }
  return segs;
}

function bipedLegs(
  body: THREE.Object3D, pal: Palette, hipY: number, hipX: number, hipZ: number,
  thick: number, len: number,
): THREE.Group[] {
  const legs: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const hip = pivot(body, side * hipX, hipY, hipZ);
    box(hip, pal.main, thick * 1.2, len * 0.55, thick * 1.6, 0, -len * 0.25, 0);
    box(hip, pal.dark, thick * 0.8, len * 0.5, thick * 0.8, 0, -len * 0.7, -thick * 0.25);
    box(hip, pal.dark, thick * 1.1, 0.12, thick * 1.8, 0, -len + 0.06, thick * 0.4);
    legs.push(hip);
  }
  return legs;
}

function quadLegs(
  body: THREE.Object3D, pal: Palette, hipY: number, hipX: number, frontZ: number, backZ: number,
  thick: number, len: number,
): THREE.Group[] {
  const legs: THREE.Group[] = [];
  for (const z of [frontZ, backZ]) {
    for (const side of [-1, 1]) {
      const hip = pivot(body, side * hipX, hipY, z);
      box(hip, pal.main, thick, len * 0.6, thick, 0, -len * 0.3, 0);
      box(hip, pal.dark, thick * 0.85, len * 0.45, thick * 0.85, 0, -len * 0.75, 0);
      box(hip, pal.dark, thick * 1.1, 0.1, thick * 1.2, 0, -len + 0.05, 0.05);
      legs.push(hip);
    }
  }
  return legs;
}

function eyesOn(head: THREE.Object3D, pal: Palette, x: number, y: number, z: number, s = 0.12): THREE.Mesh[] {
  return [-1, 1].map(side => {
    const e = box(head, pal.eye, s * 0.6, s, s, side * x, y, z);
    e.castShadow = false;
    return e;
  });
}

function finishRig(root: THREE.Group, body: THREE.Group, head: THREE.Group, jaw: THREE.Group,
  tail: THREE.Group[], legs: THREE.Group[], eyes: THREE.Mesh[], pal: Palette, height: number): DinoRig {
  return {
    root, body, head, jaw, tail, legs, eyes,
    materials: [pal.main, pal.accent, pal.belly, pal.dark, pal.horn],
    height,
  };
}

// ---------- 各類模型 ----------

function buildTheropod(pal: Palette): DinoRig {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  box(body, pal.main, 1.1, 1.05, 1.9, 0, 1.85, 0);
  box(body, pal.belly, 0.9, 0.35, 1.5, 0, 1.4, 0.1);
  for (let i = 0; i < 5; i++) box(body, pal.accent, 0.12, 0.18, 0.22, 0, 2.42, 0.7 - i * 0.4);
  // 小短手
  for (const s of [-1, 1]) box(body, pal.main, 0.14, 0.42, 0.14, s * 0.45, 1.55, 0.85);
  const head = pivot(body, 0, 2.25, 0.85);
  box(head, pal.main, 0.55, 0.6, 0.5, 0, -0.05, 0.1);
  box(head, pal.main, 0.8, 0.62, 1.2, 0, 0.15, 0.7);
  box(head, pal.accent, 0.82, 0.12, 0.5, 0, 0.5, 0.55);
  box(head, pal.horn, 0.7, 0.1, 1.0, 0, -0.18, 0.8);
  const eyes = eyesOn(head, pal, 0.41, 0.3, 0.65);
  const jaw = pivot(head, 0, -0.18, 0.25);
  box(jaw, pal.belly, 0.7, 0.24, 1.1, 0, -0.1, 0.5);
  box(jaw, pal.horn, 0.6, 0.08, 0.9, 0, 0.06, 0.55);
  const tail = tailChain(body, pal.main, new THREE.Vector3(0, 1.9, -0.9),
    [[0.85, 0.75, 1.0], [0.6, 0.55, 1.0], [0.38, 0.35, 1.0], [0.2, 0.2, 0.8]]);
  const legs = bipedLegs(body, pal, 1.55, 0.45, -0.15, 0.42, 1.55);
  return finishRig(root, body, head, jaw, tail, legs, eyes, pal, 3.2);
}

function buildRaptor(pal: Palette): DinoRig {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  box(body, pal.main, 0.55, 0.6, 1.25, 0, 1.2, 0);
  box(body, pal.belly, 0.45, 0.2, 1.0, 0, 0.95, 0.05);
  // 羽毛背脊
  for (let i = 0; i < 6; i++) box(body, pal.accent, 0.08, 0.22, 0.2, 0, 1.58, 0.5 - i * 0.22);
  // 帶羽前肢
  for (const s of [-1, 1]) {
    box(body, pal.main, 0.1, 0.45, 0.12, s * 0.32, 1.05, 0.55);
    box(body, pal.accent, 0.04, 0.35, 0.4, s * 0.38, 1.0, 0.45);
  }
  const head = pivot(body, 0, 1.5, 0.6);
  box(head, pal.main, 0.3, 0.45, 0.3, 0, 0.0, 0.0);
  box(head, pal.main, 0.38, 0.32, 0.75, 0, 0.2, 0.4);
  box(head, pal.accent, 0.06, 0.25, 0.45, 0, 0.45, 0.2);
  const eyes = eyesOn(head, pal, 0.2, 0.3, 0.45, 0.09);
  const jaw = pivot(head, 0, 0.06, 0.15);
  box(jaw, pal.belly, 0.32, 0.12, 0.62, 0, -0.04, 0.32);
  const tail = tailChain(body, pal.main, new THREE.Vector3(0, 1.25, -0.6),
    [[0.4, 0.35, 0.8], [0.25, 0.22, 0.8], [0.14, 0.12, 0.8]]);
  // 尾羽
  box(tail[2], pal.accent, 0.4, 0.04, 0.5, 0, 0, -0.7);
  const legs = bipedLegs(body, pal, 1.0, 0.25, -0.05, 0.22, 1.0);
  // 鐮刀爪
  for (const l of legs) cone(l, pal.horn, 0.05, 0.25, 0, -0.85, 0.3, -0.6);
  return finishRig(root, body, head, jaw, tail, legs, eyes, pal, 2.1);
}

function buildOrnitho(pal: Palette): DinoRig {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  box(body, pal.main, 0.6, 0.65, 1.1, 0, 1.55, 0);
  box(body, pal.belly, 0.5, 0.2, 0.9, 0, 1.28, 0.05);
  for (const s of [-1, 1]) box(body, pal.accent, 0.05, 0.4, 0.5, s * 0.33, 1.45, 0.2);
  // 長脖子
  const head = pivot(body, 0, 1.8, 0.45);
  box(head, pal.main, 0.2, 0.9, 0.2, 0, 0.35, 0.15);
  box(head, pal.main, 0.3, 0.28, 0.45, 0, 0.85, 0.35);
  cone(head, pal.horn, 0.1, 0.35, 0, 0.8, 0.72, Math.PI / 2, 0, 0, 4);
  const eyes = eyesOn(head, pal, 0.16, 0.92, 0.4, 0.08);
  const jaw = pivot(head, 0, 0.74, 0.45);
  box(jaw, pal.horn, 0.14, 0.06, 0.3, 0, 0, 0.2);
  const tail = tailChain(body, pal.main, new THREE.Vector3(0, 1.55, -0.5),
    [[0.4, 0.35, 0.8], [0.25, 0.22, 0.8], [0.14, 0.12, 0.7]]);
  const legs = bipedLegs(body, pal, 1.3, 0.25, -0.05, 0.22, 1.3);
  return finishRig(root, body, head, jaw, tail, legs, eyes, pal, 3.0);
}

function buildTherizino(pal: Palette): DinoRig {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  const torso = box(body, pal.main, 1.1, 1.5, 1.2, 0, 2.0, 0);
  torso.rotation.x = -0.35;
  box(body, pal.belly, 0.95, 1.1, 0.3, 0, 1.9, 0.5).rotation.x = -0.35;
  for (let i = 0; i < 5; i++) box(body, pal.accent, 0.1, 0.35, 0.2, 0, 2.9 - i * 0.2, -0.3 - i * 0.18);
  // 巨爪手臂
  for (const s of [-1, 1]) {
    const arm = pivot(body, s * 0.6, 2.3, 0.4);
    box(arm, pal.main, 0.2, 0.8, 0.2, 0, -0.35, 0.1);
    box(arm, pal.accent, 0.05, 0.6, 0.45, s * 0.12, -0.3, 0.0);
    for (let c = -1; c <= 1; c++) cone(arm, pal.horn, 0.05, 0.9, c * 0.07, -0.9, 0.35, 1.9, 0, 0, 4);
  }
  const head = pivot(body, 0, 2.7, 0.6);
  box(head, pal.main, 0.3, 0.9, 0.3, 0, 0.4, 0.1);
  box(head, pal.main, 0.35, 0.3, 0.5, 0, 0.9, 0.3);
  const eyes = eyesOn(head, pal, 0.18, 0.98, 0.35, 0.08);
  const jaw = pivot(head, 0, 0.8, 0.4);
  box(jaw, pal.horn, 0.2, 0.08, 0.3, 0, 0, 0.18);
  const tail = tailChain(body, pal.main, new THREE.Vector3(0, 1.5, -0.6),
    [[0.6, 0.5, 0.7], [0.35, 0.3, 0.6]]);
  const legs = bipedLegs(body, pal, 1.3, 0.4, 0, 0.4, 1.3);
  return finishRig(root, body, head, jaw, tail, legs, eyes, pal, 3.8);
}

function buildCeratops(pal: Palette): DinoRig {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  box(body, pal.main, 1.35, 1.1, 2.1, 0, 1.3, 0);
  box(body, pal.belly, 1.1, 0.3, 1.8, 0, 0.8, 0);
  const head = pivot(body, 0, 1.35, 1.05);
  box(head, pal.main, 0.85, 0.75, 0.9, 0, 0, 0.45);
  const frill = box(head, pal.accent, 1.9, 1.45, 0.14, 0, 0.55, 0.0);
  frill.rotation.x = -0.45;
  for (const s of [-1, 1]) cone(head, pal.horn, 0.09, 1.0, s * 0.25, 0.45, 0.95, 1.2, 0, 0);
  cone(head, pal.horn, 0.08, 0.35, 0, 0.15, 1.0, 1.1, 0, 0);
  const eyes = eyesOn(head, pal, 0.44, 0.2, 0.55, 0.1);
  const jaw = pivot(head, 0, -0.25, 0.6);
  box(jaw, pal.dark, 0.5, 0.2, 0.5, 0, -0.05, 0.25);
  const tail = tailChain(body, pal.main, new THREE.Vector3(0, 1.4, -1.05),
    [[0.7, 0.6, 0.8], [0.4, 0.35, 0.7]]);
  const legs = quadLegs(body, pal, 1.0, 0.5, 0.7, -0.65, 0.35, 1.0);
  return finishRig(root, body, head, jaw, tail, legs, eyes, pal, 2.6);
}

function buildHadrosaur(pal: Palette): DinoRig {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  box(body, pal.main, 0.95, 1.0, 1.9, 0, 1.75, 0);
  box(body, pal.belly, 0.8, 0.3, 1.6, 0, 1.3, 0.05);
  for (const s of [-1, 1]) box(body, pal.main, 0.16, 0.8, 0.16, s * 0.4, 1.05, 0.8);
  const head = pivot(body, 0, 2.1, 0.85);
  box(head, pal.main, 0.35, 0.7, 0.35, 0, 0.2, 0.1);
  box(head, pal.main, 0.5, 0.45, 0.8, 0, 0.55, 0.45);
  box(head, pal.horn, 0.55, 0.12, 0.35, 0, 0.38, 0.85);
  // 管狀頭冠
  const crest = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 1.5, 6), pal.accent);
  crest.position.set(0, 1.0, -0.2);
  crest.rotation.x = -1.05;
  crest.castShadow = true;
  head.add(crest);
  const eyes = eyesOn(head, pal, 0.26, 0.65, 0.45, 0.1);
  const jaw = pivot(head, 0, 0.32, 0.4);
  box(jaw, pal.belly, 0.45, 0.12, 0.5, 0, 0, 0.25);
  const tail = tailChain(body, pal.main, new THREE.Vector3(0, 1.8, -0.9),
    [[0.7, 0.8, 1.0], [0.45, 0.55, 1.0], [0.25, 0.3, 0.8]]);
  const legs = bipedLegs(body, pal, 1.45, 0.4, -0.2, 0.38, 1.45);
  return finishRig(root, body, head, jaw, tail, legs, eyes, pal, 3.3);
}

function buildCroc(pal: Palette): DinoRig {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  box(body, pal.main, 1.0, 0.55, 2.4, 0, 0.55, 0);
  for (let i = 0; i < 6; i++) {
    box(body, pal.dark, 0.18, 0.14, 0.25, -0.25, 0.88, 1.0 - i * 0.4);
    box(body, pal.dark, 0.18, 0.14, 0.25, 0.25, 0.88, 1.0 - i * 0.4);
  }
  const head = pivot(body, 0, 0.6, 1.2);
  box(head, pal.main, 0.7, 0.38, 1.4, 0, 0.05, 0.7);
  const eyes = eyesOn(head, pal, 0.25, 0.3, 0.3, 0.12);
  const jaw = pivot(head, 0, -0.12, 0.1);
  box(jaw, pal.belly, 0.66, 0.16, 1.4, 0, -0.06, 0.7);
  for (let i = 0; i < 5; i++) {
    for (const s of [-1, 1]) cone(head, pal.horn, 0.035, 0.14, s * 0.3, -0.18, 0.4 + i * 0.22, Math.PI, 0, 0, 3);
  }
  const tail = tailChain(body, pal.main, new THREE.Vector3(0, 0.55, -1.2),
    [[0.7, 0.45, 1.0], [0.45, 0.32, 1.0], [0.25, 0.22, 1.0]]);
  const legs = quadLegs(body, pal, 0.4, 0.62, 0.8, -0.8, 0.22, 0.4);
  return finishRig(root, body, head, jaw, tail, legs, eyes, pal, 1.3);
}

function buildAnkylo(pal: Palette): DinoRig {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  box(body, pal.main, 1.7, 0.85, 2.2, 0, 1.0, 0);
  box(body, pal.accent, 1.5, 0.3, 2.0, 0, 1.5, 0);
  for (let i = 0; i < 4; i++) {
    for (const s of [-1, 1]) cone(body, pal.horn, 0.12, 0.45, s * 0.95, 1.05, 0.8 - i * 0.55, 0, 0, -s * Math.PI / 2, 4);
    cone(body, pal.horn, 0.1, 0.3, (i % 2 ? 0.35 : -0.35), 1.75, 0.7 - i * 0.5, 0, 0, 0, 4);
  }
  const head = pivot(body, 0, 1.0, 1.1);
  box(head, pal.main, 0.7, 0.5, 0.6, 0, 0, 0.3);
  for (const s of [-1, 1]) cone(head, pal.horn, 0.07, 0.25, s * 0.35, 0.2, 0.2, 0, 0, -s * 0.9, 4);
  const eyes = eyesOn(head, pal, 0.36, 0.1, 0.4, 0.09);
  const jaw = pivot(head, 0, -0.2, 0.35);
  box(jaw, pal.dark, 0.5, 0.12, 0.35, 0, 0, 0.15);
  const tail = tailChain(body, pal.main, new THREE.Vector3(0, 1.05, -1.1),
    [[0.5, 0.4, 0.9], [0.3, 0.25, 0.9], [0.18, 0.18, 0.7]]);
  const club = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42), pal.horn);
  club.position.set(0, 0, -0.75);
  club.castShadow = true;
  tail[2].add(club);
  const legs = quadLegs(body, pal, 0.7, 0.6, 0.75, -0.75, 0.32, 0.7);
  return finishRig(root, body, head, jaw, tail, legs, eyes, pal, 2.0);
}

function buildPtero(pal: Palette): DinoRig {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  const torso = box(body, pal.main, 0.6, 0.7, 0.9, 0, 2.0, 0);
  torso.rotation.x = -0.4;
  // 摺疊的翅膀當作前肢
  for (const s of [-1, 1]) {
    const wing = box(body, pal.accent, 0.06, 1.3, 1.6, s * 0.55, 1.5, -0.1);
    wing.rotation.z = s * 0.25;
    box(body, pal.dark, 0.14, 2.0, 0.14, s * 0.6, 1.0, 0.45);
  }
  const head = pivot(body, 0, 2.4, 0.4);
  box(head, pal.main, 0.22, 1.2, 0.22, 0, 0.5, 0.1);
  box(head, pal.main, 0.35, 0.35, 0.6, 0, 1.15, 0.3);
  cone(head, pal.horn, 0.14, 1.4, 0, 1.12, 1.25, Math.PI / 2, 0, 0, 4);
  cone(head, pal.accent, 0.1, 0.7, 0, 1.45, -0.05, -1.1, 0, 0, 4);
  const eyes = eyesOn(head, pal, 0.19, 1.2, 0.35, 0.09);
  const jaw = pivot(head, 0, 1.02, 0.55);
  cone(jaw, pal.horn, 0.08, 1.0, 0, 0, 0.5, Math.PI / 2, 0, 0, 4);
  const tail = tailChain(body, pal.main, new THREE.Vector3(0, 1.8, -0.45), [[0.12, 0.12, 0.3]]);
  const legs = bipedLegs(body, pal, 1.6, 0.25, -0.35, 0.18, 1.6);
  return finishRig(root, body, head, jaw, tail, legs, eyes, pal, 4.0);
}

function buildChicken(pal: Palette): DinoRig {
  const root = new THREE.Group();
  const body = pivot(root, 0, 0, 0);
  const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), pal.main);
  b.position.set(0, 1.0, 0);
  b.scale.set(1, 0.9, 1.2);
  b.castShadow = true;
  body.add(b);
  for (const s of [-1, 1]) box(body, pal.belly, 0.08, 0.4, 0.6, s * 0.58, 1.0, -0.05);
  const head = pivot(body, 0, 1.4, 0.45);
  const h = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), pal.main);
  h.position.set(0, 0.2, 0.05);
  h.castShadow = true;
  head.add(h);
  const comb = mat(0xd62828);
  box(head, comb, 0.08, 0.25, 0.35, 0, 0.5, 0.0);
  box(head, comb, 0.08, 0.18, 0.1, 0, 0.0, 0.25);
  cone(head, mat(0xf4b400), 0.09, 0.25, 0, 0.18, 0.4, Math.PI / 2, 0, 0, 4);
  const eyes = eyesOn(head, pal, 0.2, 0.28, 0.2, 0.07);
  const jaw = pivot(head, 0, 0.12, 0.3);
  box(jaw, mat(0xf4b400), 0.1, 0.05, 0.15, 0, 0, 0.08);
  const tail = tailChain(body, pal.accent, new THREE.Vector3(0, 1.3, -0.5), [[0.1, 0.5, 0.35]]);
  tail[0].rotation.x = -0.7;
  const legMat = mat(0xf4b400);
  const legs: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const hip = pivot(body, s * 0.2, 0.65, 0);
    box(hip, legMat, 0.07, 0.6, 0.07, 0, -0.3, 0);
    box(hip, legMat, 0.2, 0.05, 0.3, 0, -0.62, 0.08);
    legs.push(hip);
  }
  return finishRig(root, body, head, jaw, tail, legs, eyes, pal, 2.0);
}

const BUILDERS: Record<ModelKind, (p: Palette) => DinoRig> = {
  theropod: buildTheropod,
  raptor: buildRaptor,
  ornitho: buildOrnitho,
  therizino: buildTherizino,
  ceratops: buildCeratops,
  hadrosaur: buildHadrosaur,
  croc: buildCroc,
  ankylo: buildAnkylo,
  ptero: buildPtero,
  chicken: buildChicken,
};

export function buildDino(kind: ModelKind, color: number, accent: number): DinoRig {
  return BUILDERS[kind](makePalette(color, accent));
}

export const SPECIES_MODELS: Record<string, { kind: ModelKind; color: number; accent: number }> = {
  trex: { kind: 'theropod', color: 0x8b5a3c, accent: 0x4a2c1a },
  velociraptor: { kind: 'raptor', color: 0x4f7a8f, accent: 0xe07a2e },
  triceratops: { kind: 'ceratops', color: 0x5f8a4a, accent: 0xc8643c },
  parasaurolophus: { kind: 'hadrosaur', color: 0x6a74a8, accent: 0xe0b040 },
  therizinosaurus: { kind: 'therizino', color: 0x8c7e55, accent: 0xe6d6ae },
  struthiomimus: { kind: 'ornitho', color: 0xc0a050, accent: 0x7a4a20 },
  chicken: { kind: 'chicken', color: 0xf5f0e6, accent: 0x2e2e2e },
};
