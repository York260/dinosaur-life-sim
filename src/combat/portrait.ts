import * as THREE from 'three';
import { buildDino, SPECIES_MODELS } from './models';
import { seededRandom } from '../engine/names';
import type { ReportTone } from '../engine/report';

export interface PortraitOptions {
  speciesId: string;
  seed: number;
  tone: ReportTone;
  packSize: number;
  fights: number;
  name: string;
  subtitle: string;
  catalogNo: string;
  rank: string | null;
  crown: boolean;
}

const W = 960;
const H = 720;

const SKIES: Record<ReportTone, [string, string, string]> = {
  legend: ['#1d3b53', '#e6a94a', '#ffe6a8'],
  good: ['#2c3e66', '#d9795a', '#f6c48e'],
  lone: ['#2a2f3a', '#6d6f7a', '#b9b3a6'],
  dead: ['#120808', '#4a1a10', '#8c3b1c'],
};

const RIM: Record<ReportTone, number> = {
  legend: 0xffd36b,
  good: 0xffa070,
  lone: 0xaab4c8,
  dead: 0xff6a2a,
};

/** 以 three.js 離屏渲染一張獨一無二的恐龍肖像，回傳 PNG data URL */
export function renderPortrait(o: PortraitOptions): string {
  const rnd = seededRandom(o.seed);
  const fossil = o.tone === 'dead';

  // ---------- 3D ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(fossil ? 0xffd9c0 : 0xfff4e0, 0x3a2a20, fossil ? 0.9 : 1.1));
  const key = new THREE.DirectionalLight(0xffffff, fossil ? 1.6 : 2.2);
  key.position.set(5, 9, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const rim = new THREE.DirectionalLight(RIM[o.tone], 2.4);
  rim.position.set(-6, 4, -6);
  scene.add(rim);

  // 岩石台座
  const baseMat = new THREE.MeshStandardMaterial({ color: fossil ? 0x3a2a22 : 0x5a5046, flatShading: true, roughness: 1 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.8, 0.6, 9), baseMat);
  base.position.y = -0.3;
  base.receiveShadow = true;
  scene.add(base);
  for (let i = 0; i < 7; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 + rnd() * 0.45), baseMat);
    const a = rnd() * Math.PI * 2;
    rock.position.set(Math.cos(a) * (2.8 + rnd()), 0.05, Math.sin(a) * (2.8 + rnd()));
    rock.rotation.set(rnd(), rnd(), rnd());
    rock.castShadow = true;
    scene.add(rock);
  }
  if (!fossil) {
    // 蕨葉
    const fern = new THREE.MeshStandardMaterial({ color: o.tone === 'lone' ? 0x6b6a52 : 0x4f7a3a, flatShading: true, side: THREE.DoubleSide });
    for (let i = 0; i < 9; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.2 + rnd() * 0.8, 3), fern);
      const a = rnd() * Math.PI * 2;
      leaf.position.set(Math.cos(a) * (3 + rnd() * 0.8), 0.5, Math.sin(a) * (3 + rnd() * 0.8));
      leaf.rotation.set((rnd() - 0.5) * 0.9, rnd() * 3, (rnd() - 0.5) * 0.9);
      scene.add(leaf);
    }
  }

  // 主角：顏色依種子微調，死亡者呈現化石骨骼色
  const m = SPECIES_MODELS[o.speciesId] ?? SPECIES_MODELS.trex;
  const main = new THREE.Color(m.color).offsetHSL((rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.2, (rnd() - 0.5) * 0.12);
  const accent = new THREE.Color(m.accent).offsetHSL((rnd() - 0.5) * 0.2, 0, (rnd() - 0.5) * 0.1);
  const hero = fossil
    ? buildDino(m.kind, 0xd8ccb0, 0xa89878)
    : buildDino(m.kind, main.getHex(), accent.getHex());
  hero.root.traverse(obj => { if ((obj as THREE.Mesh).isMesh) obj.castShadow = true; });

  // 姿勢
  hero.root.rotation.y = 0.55 + (rnd() - 0.5) * 0.5;
  const roar = o.fights >= 3 || rnd() < 0.35;
  hero.head.rotation.x = roar ? -0.35 : (rnd() - 0.5) * 0.2;
  hero.head.rotation.y = (rnd() - 0.5) * 0.4;
  hero.jaw.rotation.x = roar ? 0.55 : rnd() * 0.15;
  hero.tail.forEach((t, i) => { t.rotation.y = Math.sin(o.seed + i) * 0.18; });
  hero.legs.forEach((l, i) => { l.rotation.x = (i % 2 === 0 ? 1 : -1) * (0.15 + rnd() * 0.15); });
  if (fossil) {
    // 化石：趴伏在岩層上
    hero.root.rotation.z = 0.08;
    hero.root.position.y = -0.1;
    hero.head.rotation.x = 0.2;
    hero.jaw.rotation.x = 0.35;
  }
  scene.add(hero.root);
  hero.root.updateMatrixWorld(true);

  // 族群成員站在後方
  const followers = fossil ? 0 : Math.min(4, o.packSize);
  for (let i = 0; i < followers; i++) {
    const c = main.clone().offsetHSL((rnd() - 0.5) * 0.05, 0, 0.06);
    const f = buildDino(m.kind, c.getHex(), accent.getHex());
    const s = 0.42 + rnd() * 0.1;
    f.root.scale.setScalar(s);
    const side = i % 2 === 0 ? -1 : 1;
    f.root.position.set(side * (1.6 + Math.floor(i / 2) * 1.1), 0, -1.6 - Math.floor(i / 2) * 0.9);
    f.root.rotation.y = hero.root.rotation.y + side * 0.2;
    f.root.traverse(obj => { if ((obj as THREE.Mesh).isMesh) obj.castShadow = true; });
    scene.add(f.root);
  }

  // 皇冠（傳說 / 弒君）
  if (o.crown && !fossil) {
    const gold = new THREE.MeshStandardMaterial({ color: 0xf2c14e, metalness: 0.7, roughness: 0.3, emissive: 0x3a2a00 });
    const crown = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.16, 8, 1, true), gold);
    crown.add(ring);
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 4), gold);
      const a = (i / 5) * Math.PI * 2;
      spike.position.set(Math.cos(a) * 0.28, 0.18, Math.sin(a) * 0.28);
      crown.add(spike);
    }
    const headBox = new THREE.Box3().setFromObject(hero.head);
    const top = new THREE.Vector3();
    headBox.getCenter(top);
    crown.position.set(top.x, headBox.max.y - 0.04, top.z);
    scene.add(crown);
  }

  // 相機對準主角
  const box = new THREE.Box3().setFromObject(hero.root);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  const span = Math.max(size.x, size.y * 1.35, size.z * 0.8, 2.2);
  const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 200);
  const dist = span * 1.85;
  camera.position.set(center.x + dist * 0.45, center.y + span * 0.35, center.z + dist);
  camera.lookAt(center.x, center.y - size.y * 0.05, center.z);

  renderer.render(scene, camera);
  const shot = renderer.domElement;

  // ---------- 2D 合成 ----------
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const [c0, c1, c2] = SKIES[o.tone];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, c0);
  g.addColorStop(0.62, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 天空細節：星塵或灰燼
  for (let i = 0; i < 90; i++) {
    const x = rnd() * W;
    const y = rnd() * H * 0.6;
    const r = rnd() * 1.8 + 0.3;
    ctx.fillStyle = fossil ? `rgba(255,${120 + rnd() * 80},60,${0.25 + rnd() * 0.5})` : `rgba(255,255,255,${0.15 + rnd() * 0.45})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // 遠方的天體：傳說=朝陽、倖存=晨光、死亡=墜落的火球
  ctx.save();
  const sunX = W * (0.18 + rnd() * 0.15);
  const sunY = H * 0.3;
  const sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 150);
  sg.addColorStop(0, fossil ? 'rgba(255,220,150,0.95)' : 'rgba(255,245,220,0.9)');
  sg.addColorStop(0.25, fossil ? 'rgba(255,120,40,0.6)' : 'rgba(255,210,150,0.4)');
  sg.addColorStop(1, 'rgba(255,200,150,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, W, H);
  if (fossil) {
    ctx.strokeStyle = 'rgba(255,170,80,0.55)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(sunX, sunY);
    ctx.lineTo(sunX + 260, sunY - 200);
    ctx.stroke();
  }
  ctx.restore();

  ctx.drawImage(shot, 0, 0, W, H);

  // 暗角
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  // 化石復原圖：棕褐色調
  if (fossil) {
    ctx.globalCompositeOperation = 'color';
    ctx.fillStyle = 'rgba(120,70,40,0.35)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  // 標牌
  const serif = '"Noto Serif TC", "Songti TC", "PMingLiU", serif';
  ctx.fillStyle = 'rgba(12,10,8,0.62)';
  ctx.fillRect(0, H - 118, W, 118);
  ctx.fillStyle = '#f5ead8';
  ctx.font = `900 46px ${serif}`;
  ctx.fillText(o.name, 36, H - 58);
  ctx.font = `600 22px ${serif}`;
  ctx.fillStyle = '#e7c98f';
  ctx.fillText(o.subtitle, 38, H - 24);
  ctx.font = '500 16px ui-monospace, "SFMono-Regular", Menlo, monospace';
  ctx.fillStyle = 'rgba(245,234,216,0.75)';
  ctx.fillText(o.catalogNo, 36, 40);
  ctx.fillText(fossil ? '化石復原圖' : '生態復原圖', 36, 64);

  // 評等章
  if (o.rank) {
    ctx.save();
    ctx.translate(W - 92, 92);
    ctx.rotate(-0.18);
    ctx.strokeStyle = '#d8453a';
    ctx.fillStyle = 'rgba(216,69,58,0.12)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#d8453a';
    ctx.font = `900 56px ${serif}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(o.rank, 0, 4);
    ctx.restore();
  }

  const url = canvas.toDataURL('image/png');

  // 釋放
  scene.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach(x => x.dispose());
    else if (mat) mat.dispose();
  });
  renderer.dispose();
  renderer.forceContextLoss();
  return url;
}
