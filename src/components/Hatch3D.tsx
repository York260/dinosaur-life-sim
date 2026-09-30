import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildDino, SPECIES_MODELS, DinoRig } from '../combat/models';

export const TAPS_TO_HATCH = 3;

interface Props {
  speciesId: string;
  /** 每點一下蛋回報目前次數；到 TAPS_TO_HATCH 時孵化 */
  onTap: (taps: number) => void;
  onHatched: () => void;
  onRoar: () => void;
  /** 取完名字：開心跳幾下 */
  celebrate: boolean;
}

const EGG_H = 1.1;
const EGG_R = 0.42;
const SPLIT = 0.56;

function eggProfile(from: number, to: number): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  const n = 22;
  for (let i = 0; i <= n; i++) {
    const t = from + ((to - from) * i) / n;
    const r = EGG_R * Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2)) * (1 - 0.16 * t) + (t === 0 || t === 1 ? 0 : 0.001);
    pts.push(new THREE.Vector2(Math.max(0.0001, r), t * EGG_H));
  }
  return pts;
}

function eggPart(from: number, to: number, shell: THREE.Material, spot: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(eggProfile(from, to), 28), shell);
  mesh.castShadow = true;
  g.add(mesh);
  const spots: [number, number, number][] = [[0.3, 0.4, 0.09], [0.45, 2.4, 0.07], [0.7, 1.2, 0.08], [0.82, 3.9, 0.06], [0.2, 4.6, 0.07], [0.62, 5.5, 0.06]];
  for (const [t, phi, s] of spots) {
    if (t < from || t > to) continue;
    const r = EGG_R * Math.sqrt(1 - (2 * t - 1) ** 2) * (1 - 0.16 * t);
    const m = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), spot);
    m.scale.set(1, 1, 0.35);
    m.position.set(Math.cos(phi) * r, t * EGG_H, Math.sin(phi) * r);
    m.lookAt(Math.cos(phi) * r * 2, t * EGG_H, Math.sin(phi) * r * 2);
    g.add(m);
  }
  return g;
}

function crackLine(mat: THREE.Material): THREE.Mesh {
  const pts: THREE.Vector3[] = [];
  const n = 36;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const t = SPLIT + (i % 2 === 0 ? 0.035 : -0.035);
    const r = EGG_R * Math.sqrt(1 - (2 * t - 1) ** 2) * (1 - 0.16 * t) + 0.006;
    pts.push(new THREE.Vector3(Math.cos(a) * r, t * EGG_H, Math.sin(a) * r));
  }
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0), 120, 0.012, 5, true), mat);
}

export default function Hatch3D({ speciesId, onTap, onHatched, onRoar, celebrate }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cbRef = useRef({ onTap, onHatched, onRoar });
  cbRef.current = { onTap, onHatched, onRoar };
  const celebrateRef = useRef(celebrate);
  celebrateRef.current = celebrate;

  useEffect(() => {
    const wrap = wrapRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y';
    wrap.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    scene.add(new THREE.HemisphereLight(0xfff4e0, 0x6b5a48, 1.35));
    const sun = new THREE.DirectionalLight(0xffffff, 1.7);
    sun.position.set(2.5, 5, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2 });
    scene.add(sun);

    // 窩：一圈草和土
    const nest = new THREE.Group();
    const dirt = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.12, 36), new THREE.MeshStandardMaterial({ color: 0xb98a5c, roughness: 1, flatShading: true }));
    dirt.position.y = -0.06;
    dirt.receiveShadow = true;
    nest.add(dirt);
    const twigMat = new THREE.MeshStandardMaterial({ color: 0x8e6440, roughness: 1, flatShading: true });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.12, 6, 18), twigMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.05;
    ring.castShadow = true;
    ring.receiveShadow = true;
    nest.add(ring);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x6f9a4a, roughness: 1, flatShading: true });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.36, 4), leafMat);
      leaf.position.set(Math.cos(a) * 1.02, 0.14, Math.sin(a) * 1.02);
      leaf.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4);
      leaf.castShadow = true;
      nest.add(leaf);
    }
    scene.add(nest);

    // 蛋
    const shellMat = new THREE.MeshStandardMaterial({ color: 0xf4ecd8, roughness: 0.75, side: THREE.DoubleSide });
    const spotMat = new THREE.MeshStandardMaterial({ color: 0x9bb58a, roughness: 0.9 });
    const egg = new THREE.Group();
    const bottom = eggPart(0, SPLIT, shellMat, spotMat);
    const top = eggPart(SPLIT, 1, shellMat, spotMat);
    egg.add(bottom, top);
    const crack = crackLine(new THREE.MeshBasicMaterial({ color: 0x3a2c22 }));
    crack.visible = false;
    egg.add(crack);
    egg.position.y = 0.02;
    scene.add(egg);

    // 小恐龍
    const m = SPECIES_MODELS[speciesId] ?? SPECIES_MODELS.trex;
    const rig: DinoRig = buildDino(m.kind, m.color, m.accent);
    rig.root.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true; });
    const box = new THREE.Box3().setFromObject(rig.root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const babyScale = Math.min(1.3 / Math.max(size.x, size.z), 0.85 / size.y);
    const baby = new THREE.Group();
    rig.root.position.set(-center.x, -box.min.y, -center.z);
    baby.add(rig.root);
    // 看不見的大點擊範圍，手機上比較好點到
    const hitbox = new THREE.Mesh(
      new THREE.BoxGeometry(size.x * 1.5, size.y * 1.5, size.z * 1.5),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hitbox.position.y = size.y / 2;
    baby.add(hitbox);
    baby.rotation.y = -0.55;
    baby.scale.setScalar(0.0001);
    baby.visible = false;
    scene.add(baby);

    // 相機：只能左右繞
    let azimuth = 0.35;
    const R = 3.3, CAM_Y = 1.45, LOOK_Y = 0.45;
    const placeCamera = () => {
      camera.position.set(Math.sin(azimuth) * R, CAM_Y, Math.cos(azimuth) * R);
      camera.lookAt(0, LOOK_Y, 0);
    };
    const resize = () => {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.fov = w < h * 1.1 ? 46 : 36;
      camera.updateProjectionMatrix();
      placeCamera();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    // 狀態
    let taps = 0, wobble = 0, hatchT = -1, roarT = 0, jumpT = 0, time = 0, prevCelebrate = false;
    type Shard = { m: THREE.Mesh; v: THREE.Vector3; spin: THREE.Vector3; life: number };
    const shards: Shard[] = [];
    const shardGeo = new THREE.TetrahedronGeometry(0.1, 0);
    const burst = () => {
      egg.visible = false;
      for (let i = 0; i < 22; i++) {
        const a = Math.random() * Math.PI * 2;
        const up = 0.15 + Math.random() * 0.8;
        const mat = (i % 4 === 0 ? spotMat : shellMat).clone();
        mat.transparent = true;
        const m = new THREE.Mesh(shardGeo, mat);
        const sc = 0.6 + Math.random() * 1.1;
        m.scale.set(sc, sc * 0.35, sc);
        m.position.set(Math.cos(a) * EGG_R * 0.8, up * EGG_H, Math.sin(a) * EGG_R * 0.8);
        m.castShadow = true;
        scene.add(m);
        const speed = 1.6 + Math.random() * 1.8;
        shards.push({ m, v: new THREE.Vector3(Math.cos(a) * speed, 2 + Math.random() * 2.2, Math.sin(a) * speed), spin: new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12), life: 0 });
      }
    };
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    const hit = (x: number, y: number, obj: THREE.Object3D) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return raycaster.intersectObject(obj, true).length > 0;
    };

    const tapEgg = () => {
      taps++;
      wobble = 1;
      cbRef.current.onTap(taps);
      if (taps === TAPS_TO_HATCH - 1) crack.visible = true;
      if (taps >= TAPS_TO_HATCH) {
        hatchT = 0;
        burst();
        baby.visible = true;
      }
    };

    let downX = 0, downY = 0, lastX = 0, dragging = false, moved = 0;
    const el = renderer.domElement;
    const onDown = (e: PointerEvent) => { dragging = true; moved = 0; downX = lastX = e.clientX; downY = e.clientY; };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      moved = Math.max(moved, Math.hypot(e.clientX - downX, e.clientY - downY));
      if (moved > 6) { azimuth -= dx * 0.012; placeCamera(); }
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (moved > 6) return;
      if (hatchT < 0) { if (hit(e.clientX, e.clientY, egg)) tapEgg(); }
      else if (hatchT > 0.6 && hit(e.clientX, e.clientY, hitbox)) { roarT = 1; cbRef.current.onRoar(); }
    };
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    let raf = 0, last = performance.now(), hatchedSent = false;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;

      if (hatchT < 0) {
        const idle = Math.sin(time * 2.2) * 0.04 * (taps > 0 ? 1.8 : 1);
        wobble = Math.max(0, wobble - dt * 2.2);
        const shake = Math.sin(time * 38) * 0.22 * wobble;
        egg.rotation.set(0, 0, idle + shake);
        egg.position.y = 0.02 + wobble * 0.06 * Math.abs(Math.sin(time * 20));
      } else {
        hatchT += dt;
        egg.rotation.set(0, 0, 0);
        for (let i = shards.length - 1; i >= 0; i--) {
          const sh = shards[i];
          sh.life += dt;
          sh.v.y -= 9.8 * dt;
          sh.m.position.addScaledVector(sh.v, dt);
          if (sh.m.position.y < 0.02) { sh.m.position.y = 0.02; sh.v.set(sh.v.x * 0.5, Math.abs(sh.v.y) * 0.3, sh.v.z * 0.5); }
          sh.m.rotation.x += sh.spin.x * dt; sh.m.rotation.y += sh.spin.y * dt; sh.m.rotation.z += sh.spin.z * dt;
          const fade = Math.max(0, 1 - Math.max(0, sh.life - 0.55) / 0.45);
          (sh.m.material as THREE.MeshStandardMaterial).opacity = fade;
          if (fade <= 0) { scene.remove(sh.m); (sh.m.material as THREE.Material).dispose(); shards.splice(i, 1); }
        }
        // 小恐龍從碎片中彈出
        const p = Math.min(1, Math.max(0, (hatchT - 0.08) / 0.45));
        const pop = p < 1 ? 1 + Math.sin(p * Math.PI) * 0.35 - (1 - p) : 1;
        baby.scale.setScalar(babyScale * Math.max(0.0001, pop));
        if (!hatchedSent && hatchT > 0.55) { hatchedSent = true; cbRef.current.onHatched(); }
      }

      if (baby.visible) {
        if (celebrateRef.current && !prevCelebrate) jumpT = 1.35;
        prevCelebrate = celebrateRef.current;
        jumpT = Math.max(0, jumpT - dt);
        const jump = jumpT > 0 ? Math.abs(Math.sin(jumpT * Math.PI / 0.45)) * 0.35 : 0;
        baby.position.y = jump;
        rig.body.position.y = Math.sin(time * 2.4) * 0.02;
        rig.tail.forEach((t, i) => { t.rotation.y = Math.sin(time * 3 - i * 0.6) * (0.15 + roarT * 0.25); });
        rig.head.rotation.x = Math.sin(time * 1.4) * 0.06 - roarT * 0.45;
        rig.jaw.rotation.x = 0.05 + roarT * 0.8;
        rig.root.position.x = -center.x + (roarT > 0.4 ? Math.sin(time * 60) * 0.015 : 0);
        roarT = Math.max(0, roarT - dt * 1.1);
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      scene.traverse(o => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach(x => x.dispose()); else mat?.dispose();
      });
      renderer.dispose();
      el.remove();
    };
  }, [speciesId]);

  return <div ref={wrapRef} className="h3d" />;
}
