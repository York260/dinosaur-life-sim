import * as THREE from 'three';
import { EnemyProfile, EnemyMove } from '../engine/enemies';
import { ArenaOutcome } from '../engine/types';
import { buildDino, DinoRig, SPECIES_MODELS } from './models';

// ================= 設定 =================

export type ArenaEnv = 'forest' | 'river' | 'night' | 'apocalypse';

export interface ArenaConfig {
  speciesId: string;
  playerHp: number;
  str: number;
  agi: number;
  int: number;
  cha: number;
  traitIds: string[];
  packSize: number;
  packCalls: number;
  enemy: EnemyProfile;
  env: ArenaEnv;
}

export type ArenaInput = 'left' | 'right' | 'bite' | 'charge' | 'pack' | 'roar' | 'flee';

export type ArenaFx = 'hurt' | 'perfect' | 'charge' | 'ko' | 'crit' | 'roar' | 'sacrifice' | 'enrage';

export interface ArenaHud {
  playerHp: number;
  stamina: number;
  enemyHp: number;
  enemyMaxHp: number;
  combo: number;
  packCallsLeft: number;
  roarsLeft: number;
  flee: number;
  enemyState: string;
  enraged: boolean;
  banner: string | null;
  critReady: boolean;
  ended: boolean;
}

interface Callbacks {
  onHud: (hud: ArenaHud) => void;
  onFx: (fx: ArenaFx) => void;
  onEnd: (outcome: ArenaOutcome) => void;
}

// ================= 常數 =================

const LANE_X = 2.4;
const PLAYER_Z = 2.8;
const ENEMY_Z = -3.0;
const DODGE_TIME = 0.13;

type PlayerAction = 'idle' | 'bite' | 'charge_wind' | 'charge' | 'charge_ret' | 'recover' | 'hurt';
type EnemyState = 'countdown' | 'idle' | 'windup' | 'attack' | 'recover' | 'stunned' | 'dead' | 'victory';

interface Particle { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; max: number; spin: number; gravity: number }
interface Ring { mesh: THREE.Mesh; life: number; max: number; grow: number }
interface FloatText { el: HTMLDivElement; pos: THREE.Vector3; life: number; max: number }
interface Ally { rig: DinoRig; t: number; side: number; hit: boolean }

function laneOf(x: number): number {
  return Math.max(-1, Math.min(1, Math.round(x / LANE_X)));
}

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

// ================= 主類別 =================

export class ArenaGame {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private raf = 0;
  private disposed = false;
  private resizeObs: ResizeObserver;

  private player: DinoRig;
  private enemyRig: DinoRig;
  private telegraphs: THREE.Mesh[] = [];
  private telegraphFills: THREE.Mesh[] = [];
  private alertSprite: THREE.Sprite;
  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private texts: FloatText[] = [];
  private allies: Ally[] = [];
  private meteors: { mesh: THREE.Mesh; vel: THREE.Vector3 }[] = [];
  private embers: THREE.Points | null = null;
  private partGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  private partMats = new Map<number, THREE.MeshBasicMaterial>();

  // 時間控制
  private time = 0;
  private hitstop = 0;
  private slowmo = 0;
  private slowScale = 1;
  private shakeAmt = 0;
  private fovPunch = 0;

  // 玩家
  private p = {
    hp: 100, startHp: 100, stamina: 100, staminaDelay: 0,
    lane: 0, x: 0, fromX: 0, dodgeT: 1, lastDodgeAt: -9, dodgeFromLane: 0, iframe: 0,
    action: 'idle' as PlayerAction, actionT: 0, actionDur: 0, actionHit: false, z: PLAYER_Z,
    combo: 0, comboTimer: 0, critBuff: 0, flee: 0, fleeHeld: false,
    packCalls: 0, roars: 0, packCallCd: 0,
  };

  // 敵人
  private e = {
    hp: 100, maxHp: 100, lane: 0, x: 0, z: ENEMY_Z,
    state: 'countdown' as EnemyState, t: 0, dur: 2.4,
    move: 'lunge' as EnemyMove, danger: [] as number[], impactDone: false,
    secondStrike: false, laneTimer: 0, enraged: false, flash: 0, flashColor: 0xffffff, missed: false,
    stunStreak: 0, lastStunAt: -99, stunImmuneUntil: 0, armored: false, locked: false, phase2: false,
  };

  // 統計
  private stats = { damageDealt: 0, perfectDodges: 0, maxCombo: 0, interrupts: 0 };
  private banner: string | null = '3';
  private bannerT = 0;
  private ended = false;
  private endTimer = -1;
  private outcome: ArenaOutcome | null = null;

  // 物種/詞條修正
  private mods = {
    biteMult: 1, chargeMult: 1, biteSpeed: 1, comboFactor: 1, dmgTaken: 1,
    vulnMult: 1.3, iframe: 0.24, perfect: 0.2, regen: 1, dmgMult: 1, flatReduce: 0,
  };

  constructor(
    private container: HTMLElement,
    private overlay: HTMLElement,
    private cfg: ArenaConfig,
    private cb: Callbacks,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);

    this.applyMods();
    this.buildWorld();

    // 玩家模型
    const pm = SPECIES_MODELS[cfg.speciesId] || SPECIES_MODELS.trex;
    this.player = buildDino(pm.kind, pm.color, pm.accent);
    this.player.root.rotation.y = Math.PI;
    this.player.root.scale.setScalar(pm.kind === 'chicken' ? 1.1 : 0.75);
    this.scene.add(this.player.root);

    // 敵人模型
    this.enemyRig = buildDino(cfg.enemy.model, cfg.enemy.color, cfg.enemy.accent);
    this.enemyRig.root.scale.setScalar(cfg.enemy.scale);
    this.scene.add(this.enemyRig.root);
    if (cfg.enemy.boss) {
      for (const eye of this.enemyRig.eyes) {
        eye.material = new THREE.MeshStandardMaterial({ color: 0xff3300, emissive: 0xff2200, emissiveIntensity: 1.5 });
      }
    }

    this.alertSprite = this.makeTextSprite('!', '#ff2d2d');
    this.alertSprite.visible = false;
    this.scene.add(this.alertSprite);

    // 狀態初始化
    this.p.hp = cfg.playerHp;
    this.p.startHp = cfg.playerHp;
    this.p.packCalls = cfg.packCalls;
    this.p.roars = this.computeRoars();
    this.e.hp = cfg.enemy.maxHp;
    this.e.maxHp = cfg.enemy.maxHp;

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(container);
    this.resize();

    // 自動化測試掛鉤：僅在網址帶有 ?test 時開放
    if (new URLSearchParams(window.location.search).has('test')) {
      (window as unknown as { __dinoArena?: ArenaGame }).__dinoArena = this;
    }
  }

  // ================= 公開 API =================

  start() {
    this.clock.start();
    const loop = () => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(loop);
      const raw = Math.min(0.05, this.clock.getDelta());
      this.update(raw);
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    for (const t of this.texts) t.el.remove();
    this.scene.traverse(obj => {
      const m = obj as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach(x => x.dispose());
      else if (mat) mat.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
    const w = window as unknown as { __dinoArena?: ArenaGame };
    if (w.__dinoArena === this) delete w.__dinoArena;
  }

  press(input: ArenaInput) {
    if (this.ended || this.e.state === 'countdown') {
      if (input === 'flee') this.p.fleeHeld = true;
      return;
    }
    switch (input) {
      case 'left': this.dodge(-1); break;
      case 'right': this.dodge(1); break;
      case 'bite': this.startBite(); break;
      case 'charge': this.startCharge(); break;
      case 'pack': this.callPack(); break;
      case 'roar': this.roar(); break;
      case 'flee': this.p.fleeHeld = true; break;
    }
  }

  release(input: ArenaInput) {
    if (input === 'flee') this.p.fleeHeld = false;
  }

  /** 測試用：直接造成傷害 */
  debugDamageEnemy(n: number) {
    this.damageEnemy(n, false, 'debug');
  }

  // ================= 初始化 =================

  private applyMods() {
    const m = this.mods;
    const id = this.cfg.speciesId;
    const t = this.cfg.traitIds;
    if (id === 'trex') m.biteMult = 1.5;
    if (id === 'velociraptor') { m.biteSpeed = 0.7; m.comboFactor = 2; }
    if (id === 'triceratops') { m.chargeMult = 1.7; m.dmgTaken = 0.8; }
    if (id === 'therizinosaurus') m.vulnMult = 2.0;
    if (id === 'struthiomimus') { m.iframe += 0.1; m.perfect += 0.08; m.regen = 1.4; }
    if (id === 'chicken') m.biteSpeed = 0.7;
    m.iframe += Math.min(0.08, this.cfg.agi * 0.0012);
    if (t.includes('swift_runner')) m.iframe += 0.05;
    if (t.includes('lame')) m.iframe -= 0.06;
    if (t.includes('thick_scales')) m.flatReduce = 4;
    if (t.includes('battle_hardened')) m.dmgMult *= 1.15;
    if (t.includes('legend_hunter')) m.dmgMult *= 1.2;
  }

  private computeRoars(): number {
    const id = this.cfg.speciesId;
    let n = 0;
    if (id === 'trex' || id === 'parasaurolophus') n += 1;
    if (id === 'parasaurolophus') n += 1;
    if (this.cfg.traitIds.includes('terrifying_roar')) n += 1;
    if (this.cfg.cha >= 35) n += 1;
    return n;
  }

  private buildWorld() {
    const env = this.cfg.env;
    const skies: Record<ArenaEnv, number> = {
      forest: 0xa8d0dc, river: 0xb4d8e6, night: 0x0e1630, apocalypse: 0x3a1206,
    };
    const fogs: Record<ArenaEnv, number> = {
      forest: 0xbcd8c8, river: 0xc4dde6, night: 0x121a36, apocalypse: 0x5a1a08,
    };
    this.scene.background = new THREE.Color(skies[env]);
    this.scene.fog = new THREE.Fog(fogs[env], 18, 60);

    const hemi = new THREE.HemisphereLight(
      env === 'apocalypse' ? 0xff8855 : env === 'night' ? 0x6677aa : 0xfff4dd,
      env === 'apocalypse' ? 0x331100 : 0x445533,
      env === 'night' ? 0.7 : 1.0,
    );
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(
      env === 'apocalypse' ? 0xff6a2a : env === 'night' ? 0x9fb4ff : 0xffffff,
      env === 'night' ? 1.0 : 2.0,
    );
    sun.position.set(6, 14, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = -12; sc.right = 12; sc.top = 12; sc.bottom = -12;
    this.scene.add(sun);

    // 地面
    const groundColors: Record<ArenaEnv, [number, number]> = {
      forest: [0x6f8f4a, 0x8a7a50], river: [0x7a9a58, 0x9a8a60], night: [0x2e3f2a, 0x3a3a2e], apocalypse: [0x3a2418, 0x1c120c],
    };
    const geo = new THREE.PlaneGeometry(90, 90, 45, 45);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors: number[] = [];
    const c1 = new THREE.Color(groundColors[env][0]);
    const c2 = new THREE.Color(groundColors[env][1]);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const arena = Math.abs(x) < 7 && Math.abs(z) < 10;
      const h = arena ? 0 : Math.random() * 0.9 * Math.min(1, (Math.abs(x) - 5) / 8 + (Math.abs(z) - 8) / 10);
      pos.setY(i, Math.max(0, h) - 0.02);
      const c = c1.clone().lerp(c2, Math.random() * 0.6);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 戰鬥跑道提示
    for (const lane of [-1, 0, 1]) {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(2.0, 10),
        new THREE.MeshBasicMaterial({ color: env === 'apocalypse' ? 0x000000 : 0xffffff, transparent: true, opacity: 0.06, depthWrite: false }),
      );
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(lane * LANE_X, 0.01, 0);
      this.scene.add(strip);

      const tg = new THREE.Mesh(
        new THREE.PlaneGeometry(2.1, 10.5),
        new THREE.MeshBasicMaterial({ color: 0xff1a1a, transparent: true, opacity: 0, depthWrite: false }),
      );
      tg.rotation.x = -Math.PI / 2;
      tg.position.set(lane * LANE_X, 0.02, 0);
      this.scene.add(tg);
      this.telegraphs.push(tg);

      const fill = new THREE.Mesh(
        new THREE.PlaneGeometry(2.1, 1),
        new THREE.MeshBasicMaterial({ color: 0xff4d00, transparent: true, opacity: 0, depthWrite: false }),
      );
      fill.rotation.x = -Math.PI / 2;
      fill.position.set(lane * LANE_X, 0.03, 0);
      this.scene.add(fill);
      this.telegraphFills.push(fill);
    }

    // 水域
    if (env === 'river') {
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(14, 90),
        new THREE.MeshStandardMaterial({ color: 0x3b7ea8, transparent: true, opacity: 0.85, roughness: 0.2, metalness: 0.1 }),
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(-15, 0.15, 0);
      this.scene.add(water);
    }

    // 樹木與岩石
    const trunkMat = new THREE.MeshStandardMaterial({ color: env === 'apocalypse' ? 0x1a0e08 : 0x5a3e28, flatShading: true });
    const leafMat = new THREE.MeshStandardMaterial({
      color: env === 'apocalypse' ? 0x2a1a10 : env === 'night' ? 0x1f3a2a : 0x3f7a3a, flatShading: true,
    });
    const rockMat = new THREE.MeshStandardMaterial({ color: env === 'apocalypse' ? 0x2a2222 : 0x7a7468, flatShading: true });
    for (let i = 0; i < 70; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = rand(12, 38);
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r - 6;
      if (z > 8 && Math.abs(x) < 10) continue; // 別擋住鏡頭
      if (env === 'river' && x < -8 && x > -22) continue;
      if (Math.random() < 0.7) {
        const g = new THREE.Group();
        const h = rand(2.5, 5.5);
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, h, 5), trunkMat);
        trunk.position.y = h / 2;
        trunk.castShadow = true;
        g.add(trunk);
        if (env !== 'apocalypse' || Math.random() < 0.3) {
          const kind = Math.random();
          if (kind < 0.5) {
            // 針葉樹
            for (let k = 0; k < 3; k++) {
              const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.4 - k * 0.35, 1.8, 6), leafMat);
              leaf.position.y = h - 0.4 + k * 0.9;
              leaf.castShadow = true;
              g.add(leaf);
            }
          } else {
            // 蘇鐵 / 棕櫚狀
            for (let k = 0; k < 6; k++) {
              const frond = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 2.2), leafMat);
              frond.position.set(0, h, 0);
              frond.rotation.set(0.5, (k / 6) * Math.PI * 2, 0);
              frond.translateZ(0.9);
              frond.castShadow = true;
              g.add(frond);
            }
          }
        }
        g.position.set(x, 0, z);
        this.scene.add(g);
      } else {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.5, 1.6)), rockMat);
        rock.position.set(x, 0.3, z);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        this.scene.add(rock);
      }
    }

    // 遠方火山
    const volcano = new THREE.Mesh(
      new THREE.ConeGeometry(14, 16, 9, 1, true),
      new THREE.MeshStandardMaterial({ color: env === 'apocalypse' ? 0x1a0f0a : 0x4a4038, flatShading: true }),
    );
    volcano.position.set(22, 7, -55);
    this.scene.add(volcano);
    const crater = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 8, 6),
      new THREE.MeshBasicMaterial({ color: env === 'apocalypse' ? 0xff4400 : 0xff7a2a }),
    );
    crater.position.set(22, 14.5, -55);
    this.scene.add(crater);

    if (env === 'night') {
      const moon = new THREE.Mesh(new THREE.SphereGeometry(2, 12, 10), new THREE.MeshBasicMaterial({ color: 0xf4f0d8 }));
      moon.position.set(-20, 22, -60);
      this.scene.add(moon);
    }

    if (env === 'apocalypse') {
      // 燃燒的天空：灰燼粒子
      const n = 400;
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        arr[i * 3] = rand(-30, 30);
        arr[i * 3 + 1] = rand(0, 20);
        arr[i * 3 + 2] = rand(-40, 10);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      this.embers = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xff8a3a, size: 0.18 }));
      this.scene.add(this.embers);
      // 火流星
      for (let i = 0; i < 6; i++) {
        const m = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.35, 5, 5),
          new THREE.MeshBasicMaterial({ color: 0xffb040 }),
        );
        this.resetMeteor(m, true);
        this.scene.add(m);
        this.meteors.push({ mesh: m, vel: new THREE.Vector3(-8, -14, 3) });
      }
    }
  }

  private resetMeteor(m: THREE.Mesh, initial = false) {
    m.position.set(rand(-10, 50), rand(30, 50) + (initial ? rand(0, 30) : 0), rand(-70, -25));
    m.lookAt(m.position.clone().add(new THREE.Vector3(-8, -14, 3)));
    m.rotateX(Math.PI / 2);
  }

  private makeTextSprite(text: string, color: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.font = 'bold 110px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#000';
    ctx.strokeText(text, 64, 70);
    ctx.fillStyle = color;
    ctx.fillText(text, 64, 70);
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sprite.scale.set(1.3, 1.3, 1);
    return sprite;
  }

  private resize() {
    const w = this.container.clientWidth || 800;
    const h = this.container.clientHeight || 450;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    // 直式螢幕拉遠
    this.camera.fov = w / h < 1 ? 70 : 50;
    this.camera.updateProjectionMatrix();
  }

  // ================= 玩家動作 =================

  private spend(cost: number): boolean {
    if (this.p.stamina < cost) {
      this.floatText(this.playerPos(2.5), '體力不足', 'ft-warn');
      return false;
    }
    this.p.stamina -= cost;
    this.p.staminaDelay = 0.35;
    return true;
  }

  private busy(): boolean {
    const a = this.p.action;
    return a === 'charge_wind' || a === 'charge' || a === 'charge_ret' || a === 'recover' || a === 'hurt';
  }

  private dodge(dir: number) {
    if (this.busy()) return;
    if (this.p.action === 'bite' && this.p.actionT < this.p.actionDur * 0.5) return;
    const target = Math.max(-1, Math.min(1, this.p.lane + dir));
    if (target === this.p.lane) {
      // 貼邊也能原地翻滾取得無敵幀
      if (!this.spend(12)) return;
    } else if (!this.spend(12)) return;
    this.p.action = 'idle';
    this.p.z = PLAYER_Z;
    this.p.dodgeFromLane = this.p.lane;
    this.p.fromX = this.p.x;
    this.p.lane = target;
    this.p.dodgeT = 0;
    this.p.iframe = this.mods.iframe;
    this.p.lastDodgeAt = this.time;
    this.dust(this.playerPos(0.2), 8);
  }

  private startBite() {
    if (this.busy() || this.p.action === 'bite') return;
    if (!this.spend(14)) return;
    this.p.action = 'bite';
    this.p.actionT = 0;
    this.p.actionDur = 0.34 * this.mods.biteSpeed;
    this.p.actionHit = false;
  }

  private startCharge() {
    if (this.busy() || this.p.action === 'bite') return;
    if (!this.spend(40)) return;
    this.p.action = 'charge_wind';
    this.p.actionT = 0;
    this.p.actionDur = 0.3;
    this.p.actionHit = false;
  }

  private callPack() {
    if (this.p.packCalls <= 0) {
      this.floatText(this.playerPos(2.5), this.cfg.packSize > 0 ? '族群已疲憊' : '沒有族群', 'ft-warn');
      return;
    }
    if (this.p.packCallCd > 0) return;
    this.p.packCalls--;
    this.p.packCallCd = 2.5;
    const pm = SPECIES_MODELS[this.cfg.speciesId] || SPECIES_MODELS.trex;
    const count = Math.min(3, Math.max(2, Math.ceil(this.cfg.packSize / 3)));
    for (let i = 0; i < count; i++) {
      const rig = buildDino(pm.kind, pm.color, pm.accent);
      rig.root.scale.setScalar(0.5);
      const side = i % 2 === 0 ? -1 : 1;
      rig.root.position.set(side * (6 + i), 0, PLAYER_Z + 1);
      this.scene.add(rig.root);
      this.allies.push({ rig, t: -i * 0.15, side, hit: false });
    }
    this.showBanner('族群突擊！', 1.0);
  }

  private roar() {
    if (this.p.roars <= 0) {
      this.floatText(this.playerPos(2.5), '無法咆哮', 'ft-warn');
      return;
    }
    if (this.busy()) return;
    if (!this.spend(20)) return;
    this.p.roars--;
    this.cb.onFx('roar');
    this.shake(0.5);
    this.ring(this.playerPos(0.5), 0xffe08a, 9, 0.6);
    this.jawOpen(this.player, 1);
    if (this.e.state === 'windup' || this.e.state === 'attack') {
      if (!this.e.armored) {
        this.stunEnemy(1.6);
        this.stats.interrupts++;
        this.floatText(this.enemyPos(), '震懾！', 'ft-big');
      } else this.stunEnemy(0);
    } else if (this.e.state !== 'dead') {
      this.stunEnemy(0.9);
      this.floatText(this.enemyPos(), '威嚇！', 'ft-mid');
    }
  }

  // ================= 傷害與效果 =================

  private playerDamage(base: number, kind: 'bite' | 'charge' | 'ally'): { dmg: number; crit: boolean; vuln: boolean } {
    let dmg = base * this.mods.dmgMult;
    const vuln = this.e.state === 'recover' || this.e.state === 'stunned';
    if (vuln && kind !== 'ally') dmg *= this.mods.vulnMult;
    let crit = false;
    if (kind !== 'ally') {
      const critChance = 0.08 + this.cfg.int * 0.0015;
      if (this.p.critBuff > 0 || Math.random() < critChance) {
        crit = true;
        dmg *= 1.8;
        this.p.critBuff = 0;
      }
    }
    return { dmg: Math.round(dmg * rand(0.9, 1.1)), crit, vuln };
  }

  private damageEnemy(dmg: number, crit: boolean, source: string, vuln = false) {
    if (this.e.state === 'dead') return;
    this.e.hp = Math.max(0, this.e.hp - dmg);
    this.stats.damageDealt += dmg;
    this.e.flash = 0.12;
    this.e.flashColor = crit ? 0xffee55 : 0xffffff;
    const pos = this.enemyPos();
    const label = `${crit ? '暴擊 ' : ''}${dmg}`;
    this.floatText(pos, label, crit ? 'ft-crit' : vuln ? 'ft-big' : 'ft-dmg');
    if (vuln && source !== 'ally') this.floatText(pos.clone().add(new THREE.Vector3(0, 0.8, 0)), '破綻！', 'ft-mid');
    this.sparks(pos, crit ? 26 : 14, crit ? 0xffd23a : 0xff8a3a);
    this.shake(crit ? 0.55 : 0.3);
    this.hitstop = crit ? 0.11 : 0.06;
    if (crit) this.cb.onFx('crit');

    if (this.cfg.enemy.boss && !this.e.phase2 && this.e.hp > 0 && this.e.hp < this.e.maxHp * 0.6) {
      this.e.phase2 = true;
      this.showBanner('第二階段！招式變得更凶', 1.4);
    }
    if (!this.e.enraged && this.e.hp > 0 && this.e.hp < this.e.maxHp * 0.35) {
      this.e.enraged = true;
      this.showBanner(`${this.cfg.enemy.name} 狂暴化！`, 1.2);
      this.cb.onFx('enrage');
      for (const eye of this.enemyRig.eyes) {
        const m = eye.material as THREE.MeshStandardMaterial;
        m.emissive.setHex(0xff0000);
        m.emissiveIntensity = 2;
      }
    }

    if (this.e.hp <= 0) this.enemyDies();
  }

  private damagePlayer(dmg: number) {
    const d = Math.max(2, Math.round(dmg * this.mods.dmgTaken - this.mods.flatReduce));
    this.p.hp = Math.max(0, this.p.hp - d);
    this.p.combo = 0;
    this.p.flee = 0;
    this.p.action = 'hurt';
    this.p.actionT = 0;
    this.p.actionDur = 0.3;
    this.p.z = PLAYER_Z;
    this.cb.onFx('hurt');
    this.shake(0.7);
    this.hitstop = 0.09;
    this.flashRig(this.player, 0xff2222);
    const pos = this.playerPos(2);
    this.floatText(pos, `-${d}`, 'ft-hurt');
    this.sparks(pos, 16, 0xd63031);
    if (this.p.hp <= 0) this.playerFalls();
  }

  private playerFalls() {
    if (this.ended) return;
    if (this.cfg.packSize > 0) {
      // 族人代死
      this.p.hp = 10;
      this.cb.onFx('sacrifice');
      this.showBanner('族人挺身而出，替你擋下了致命一擊！', 2);
      this.finish('defeat', 1);
    } else {
      this.showBanner('你倒下了……', 2);
      this.player.root.rotation.z = Math.PI / 2;
      this.finish('death', 0);
    }
  }

  private enemyDies() {
    this.e.state = 'dead';
    this.e.t = 0;
    this.slowmo = 1.4;
    this.slowScale = 0.25;
    this.hitstop = 0.18;
    this.shake(1.2);
    this.cb.onFx('ko');
    this.sparks(this.enemyPos(), 50, 0xffd23a);
    this.ring(this.enemyPos(0.3), 0xffffff, 10, 0.8);
    this.hideTelegraph();
    this.showBanner('K.O.！', 2);
    this.finish('victory', 0);
  }

  private finish(result: ArenaOutcome['result'], packLost: number) {
    this.ended = true;
    this.endTimer = 1.8;
    this.outcome = {
      result,
      hpLost: Math.max(0, this.p.startHp - this.p.hp),
      finalHp: this.p.hp,
      packLost,
      damageDealt: this.stats.damageDealt,
      perfectDodges: this.stats.perfectDodges,
      maxCombo: this.stats.maxCombo,
      interrupts: this.stats.interrupts,
      timeSec: Math.round(this.time),
      enemyName: this.cfg.enemy.name,
    };
  }

  private enemyDead(): boolean {
    return this.e.state === 'dead';
  }

  private stunEnemy(sec: number) {
    if (this.e.state === 'dead') return;
    if (this.e.armored && (this.e.state === 'windup' || this.e.state === 'attack')) {
      this.floatText(this.enemyPos().add(new THREE.Vector3(0, 1, 0)), '霸體！', 'ft-warn');
      return;
    }
    if (this.time < this.e.stunImmuneUntil) return;
    if (this.time - this.e.lastStunAt > 4) this.e.stunStreak = 0;
    const scale = [1, 0.6, 0.35][Math.min(2, this.e.stunStreak)];
    this.e.stunStreak++;
    sec *= scale;
    this.e.lastStunAt = this.time;
    this.e.stunImmuneUntil = this.time + sec + 1.5;
    this.e.state = 'stunned';
    this.e.t = 0;
    this.e.dur = sec;
    this.e.secondStrike = false;
    this.hideTelegraph();
  }

  // ================= 敵人 AI =================

  private pickMove(): EnemyMove {
    const pool: Partial<Record<EnemyMove, number>> = { ...this.cfg.enemy.moves };
    if (this.e.phase2) {
      pool.double = (pool.double ?? 0) + 2;
      pool.stomp = (pool.stomp ?? 0) + 2;
    }
    const entries = Object.entries(pool) as [EnemyMove, number][];
    const total = entries.reduce((a, [, w]) => a + w, 0);
    let r = Math.random() * total;
    for (const [m, w] of entries) {
      r -= w;
      if (r <= 0) return m;
    }
    return 'lunge';
  }

  private beginWindup(move: EnemyMove, quick = false) {
    const e = this.e;
    const pl = this.p.lane;
    e.move = move;
    e.state = 'windup';
    e.t = 0;
    e.impactDone = false;
    e.armored = move === 'stomp' || e.secondStrike;
    e.locked = false;
    const intBonus = 1 + Math.min(0.35, this.cfg.int * 0.004);
    const enrage = e.enraged ? 0.8 : 1;
    e.dur = this.cfg.enemy.windup * intBonus * enrage * (quick ? 0.55 : 1);
    if (move === 'lunge' || move === 'double') {
      e.danger = [pl];
    } else if (move === 'sweep') {
      const other = pl === 0 ? (Math.random() < 0.5 ? -1 : 1) : 0;
      e.danger = [pl, other].sort();
    } else {
      e.danger = [-1, 0, 1];
      e.dur *= 1.15;
    }
    this.alertSprite.visible = true;
  }

  private beginAttack() {
    const e = this.e;
    e.state = 'attack';
    e.t = 0;
    e.dur = e.move === 'sweep' ? 0.32 : e.move === 'stomp' ? 0.28 : 0.2;
    this.alertSprite.visible = false;
  }

  private resolveImpact() {
    const e = this.e;
    e.impactDone = true;
    const pLane = laneOf(this.p.x);
    const inDanger = e.danger.includes(pLane);
    const dodgedRecently = this.time - this.p.lastDodgeAt <= this.mods.perfect + 0.02;
    const wasTargeted = e.danger.includes(this.p.dodgeFromLane);
    const mult = e.move === 'double' ? 0.7 : e.move === 'sweep' ? 0.9 : e.move === 'stomp' ? 1.1 : 1;

    if (e.move === 'stomp') {
      this.ring(this.enemyPos(0.1), 0xffaa55, 12, 0.5);
      this.shake(0.6);
      this.dust(this.enemyPos(0.2), 20);
    }

    if (inDanger && this.p.iframe <= 0) {
      this.damagePlayer(this.cfg.enemy.damage * mult);
      e.missed = false;
    } else {
      e.missed = true;
      if (dodgedRecently && wasTargeted) {
        this.stats.perfectDodges++;
        this.p.critBuff = 2.0;
        this.slowmo = 0.5;
        this.slowScale = 0.3;
        this.p.stamina = Math.min(100, this.p.stamina + 25);
        this.cb.onFx('perfect');
        this.floatText(this.playerPos(2.6), '完美閃避！', 'ft-perfect');
      } else if (inDanger || wasTargeted) {
        this.floatText(this.playerPos(2.4), '閃過', 'ft-mid');
      }
    }
  }

  private updateEnemy(dt: number) {
    const e = this.e;
    const tpl = this.cfg.enemy;
    e.t += dt;

    // 橫向跟蹤
    const targetX = e.state === 'windup' || e.state === 'attack'
      ? (e.danger.length === 1 ? e.danger[0] * LANE_X : (e.move === 'sweep' ? (e.danger[0] + e.danger[1]) / 2 * LANE_X : e.x))
      : e.lane * LANE_X;
    e.x += (targetX - e.x) * Math.min(1, dt * 6);

    switch (e.state) {
      case 'countdown': {
        const remain = e.dur - e.t;
        const b = remain > 1.6 ? '3' : remain > 0.8 ? '2' : remain > 0 ? '1' : null;
        if (b) this.banner = b;
        if (e.t >= e.dur) {
          this.showBanner('開戰！', 0.7);
          e.state = 'idle';
          e.t = 0;
          e.dur = 0.8;
        }
        break;
      }
      case 'idle': {
        e.laneTimer -= dt;
        if (e.laneTimer <= 0) {
          e.laneTimer = rand(0.35, 0.7);
          if (e.lane !== this.p.lane) e.lane += Math.sign(this.p.lane - e.lane);
        }
        e.z += (ENEMY_Z - e.z) * Math.min(1, dt * 4);
        if (e.t >= e.dur) this.beginWindup(this.pickMove());
        break;
      }
      case 'windup': {
        if (!e.locked && e.t >= e.dur * 0.6 && (e.move === 'lunge' || e.move === 'double')) {
          e.locked = true;
          e.danger = [laneOf(this.p.x)];
        }
        if (e.t >= e.dur) this.beginAttack();
        break;
      }
      case 'attack': {
        const k = Math.min(1, e.t / e.dur);
        if (e.move === 'lunge' || e.move === 'double') {
          e.z = ENEMY_Z + (PLAYER_Z - 2.2 - ENEMY_Z) * Math.sin(k * Math.PI / 2);
          if (k >= 1 && !e.impactDone) this.resolveImpact();
        } else if (e.move === 'sweep') {
          if (k >= 0.5 && !e.impactDone) this.resolveImpact();
        } else if (k >= 1 && !e.impactDone) {
          this.resolveImpact();
        }
        if (e.t >= e.dur) {
          if (e.move === 'double' && !e.secondStrike && !this.ended) {
            e.secondStrike = true;
            this.beginWindup('lunge', true);
            e.move = 'double';
          } else {
            e.state = 'recover';
            e.t = 0;
            e.secondStrike = false;
            e.dur = tpl.recovery * (e.missed ? 1.2 : 0.7) * (e.enraged ? 0.8 : 1);
            if (e.missed) this.floatText(this.enemyPos(), '露出破綻', 'ft-open');
          }
        }
        break;
      }
      case 'recover': {
        e.z += (ENEMY_Z - e.z) * Math.min(1, dt * 2.5);
        if (e.t >= e.dur) {
          e.state = 'idle';
          e.t = 0;
          e.dur = tpl.idle * rand(0.7, 1.3) * (e.enraged ? 0.6 : 1);
          e.lane = laneOf(e.x);
        }
        break;
      }
      case 'stunned': {
        e.z += (ENEMY_Z - e.z) * Math.min(1, dt * 3);
        if (e.t >= e.dur) {
          e.state = 'idle';
          e.t = 0;
          e.dur = 0.5;
          e.lane = laneOf(e.x);
        }
        break;
      }
      case 'dead': {
        const r = this.enemyRig.root;
        r.rotation.z += (Math.PI / 2 - r.rotation.z) * Math.min(1, dt * 3);
        r.position.y += (-0.4 - r.position.y) * Math.min(1, dt * 2);
        break;
      }
    }
  }

  // ================= 玩家更新 =================

  private updatePlayer(dt: number) {
    const p = this.p;
    // 閃避橫移
    if (p.dodgeT < 1) {
      p.dodgeT = Math.min(1, p.dodgeT + dt / DODGE_TIME);
      const k = 1 - Math.pow(1 - p.dodgeT, 3);
      p.x = p.fromX + (p.lane * LANE_X - p.fromX) * k;
    } else {
      p.x = p.lane * LANE_X;
    }
    p.iframe = Math.max(0, p.iframe - dt);

    // 體力
    p.staminaDelay -= dt;
    if (p.staminaDelay <= 0) {
      p.stamina = Math.min(100, p.stamina + (26 + this.cfg.agi * 0.3) * this.mods.regen * dt);
    }
    p.comboTimer -= dt;
    if (p.comboTimer <= 0) p.combo = 0;
    p.critBuff = Math.max(0, p.critBuff - dt);
    p.packCallCd = Math.max(0, p.packCallCd - dt);

    // 撤退
    if (p.fleeHeld && !this.ended && this.e.state !== 'countdown') {
      p.flee = Math.min(1, p.flee + dt / 1.6);
      if (p.flee >= 1) {
        this.showBanner('你撤退了', 1.5);
        this.finish('fled', 0);
      }
    } else {
      p.flee = Math.max(0, p.flee - dt * 1.5);
    }

    p.actionT += dt;
    const reach = this.e.z + 2.4 * this.cfg.enemy.scale * 0.6;
    switch (p.action) {
      case 'bite': {
        const k = p.actionT / p.actionDur;
        const fwd = k < 0.4 ? k / 0.4 : Math.max(0, 1 - (k - 0.4) / 0.6);
        p.z = PLAYER_Z - fwd * 1.6;
        this.jawOpen(this.player, k < 0.35 ? 1 : 0);
        if (k >= 0.4 && !p.actionHit) {
          p.actionHit = true;
          this.tryHit('bite');
        }
        if (k >= 1) { p.action = 'idle'; p.z = PLAYER_Z; }
        break;
      }
      case 'charge_wind': {
        p.z = PLAYER_Z + 0.4 * (p.actionT / p.actionDur);
        if (p.actionT >= p.actionDur) {
          p.action = 'charge';
          p.actionT = 0;
          p.actionDur = 0.2;
          p.iframe = Math.max(p.iframe, 0.1);
          this.cb.onFx('charge');
          this.fovPunch = 1;
        }
        break;
      }
      case 'charge': {
        const k = Math.min(1, p.actionT / p.actionDur);
        const target = Math.max(reach, -0.5);
        p.z = PLAYER_Z + 0.4 + (target - PLAYER_Z - 0.4) * k;
        if (Math.random() < 0.6) this.dust(this.playerPos(0.1), 1);
        if (k >= 1 && !p.actionHit) {
          p.actionHit = true;
          const hit = this.tryHit('charge');
          p.action = hit ? 'charge_ret' : 'recover';
          p.actionT = 0;
          p.actionDur = hit ? 0.3 : 0.85;
          if (!hit) this.floatText(this.playerPos(2.4), '撲空！', 'ft-warn');
        }
        break;
      }
      case 'charge_ret':
      case 'recover': {
        const k = Math.min(1, p.actionT / p.actionDur);
        p.z = p.z + (PLAYER_Z - p.z) * Math.min(1, k * 0.5 + dt * 6);
        if (k >= 1) { p.action = 'idle'; p.z = PLAYER_Z; }
        break;
      }
      case 'hurt': {
        if (p.actionT >= p.actionDur) p.action = 'idle';
        break;
      }
      default:
        break;
    }
  }

  private tryHit(kind: 'bite' | 'charge'): boolean {
    const e = this.e;
    if (e.state === 'dead' || e.state === 'countdown') return false;
    if (Math.abs(this.p.x - e.x) > 1.4) {
      if (kind === 'bite') this.floatText(this.playerPos(2.4), '沒咬到', 'ft-warn');
      return false;
    }
    if (kind === 'bite') {
      this.p.combo = this.p.comboTimer > 0 ? this.p.combo + 1 : 1;
      this.p.comboTimer = 0.9;
      this.stats.maxCombo = Math.max(this.stats.maxCombo, this.p.combo);
      const comboMult = 1 + 0.12 * Math.min(6, this.p.combo - 1) * this.mods.comboFactor;
      const { dmg, crit, vuln } = this.playerDamage((6 + this.cfg.str * 0.3) * this.mods.biteMult * comboMult * (this.cfg.enemy.biteTaken ?? 1), 'bite');
      this.damageEnemy(dmg, crit, 'bite', vuln);
      if (this.p.combo >= 3) this.floatText(this.playerPos(3), `${this.p.combo} 連擊`, 'ft-combo');
    } else {
      const evade = this.cfg.enemy.evadeCharge ?? 0;
      if (evade > 0 && e.state !== 'windup' && e.state !== 'stunned' && Math.random() < evade) {
        this.floatText(this.enemyPos().add(new THREE.Vector3(0, 1, 0)), '被閃開了！', 'ft-warn');
        return false;
      }
      const interrupt = e.state === 'windup' && !e.armored;
      const { dmg, crit, vuln } = this.playerDamage((12 + this.cfg.str * 0.55) * this.mods.chargeMult * (this.cfg.enemy.chargeTaken ?? 1), 'charge');
      this.damageEnemy(dmg, crit, 'charge', vuln);
      if (!this.enemyDead()) {
        e.z -= 1.2;
        if (interrupt) {
          this.stats.interrupts++;
          this.floatText(this.enemyPos().add(new THREE.Vector3(0, 1, 0)), '打斷！', 'ft-big');
          this.stunEnemy(1.1);
        }
      }
      this.shake(0.9);
      this.ring(this.enemyPos(0.3), 0xffffff, 4, 0.35);
    }
    return true;
  }

  // ================= 族群 =================

  private updateAllies(dt: number) {
    for (const a of this.allies) {
      a.t += dt;
      const r = a.rig.root;
      if (a.t < 0) continue;
      if (!a.hit) {
        const k = Math.min(1, a.t / 0.5);
        const tx = this.e.x + a.side * 1.2;
        const tz = this.e.z + 1.5;
        r.position.x += (tx - r.position.x) * Math.min(1, k * 0.6 + dt * 5);
        r.position.z += (tz - r.position.z) * Math.min(1, k * 0.6 + dt * 5);
        r.lookAt(this.e.x, 0, this.e.z);
        this.animateLegs(a.rig, a.t * 25, 0.8);
        if (k >= 1) {
          a.hit = true;
          this.jawOpen(a.rig, 1);
          if (this.e.state !== 'dead') {
            const { dmg } = this.playerDamage(6 + this.cfg.cha * 0.25 + this.cfg.packSize, 'ally');
            this.damageEnemy(dmg, false, 'ally');
            if (this.e.state === 'windup') {
              this.stats.interrupts++;
              this.floatText(this.enemyPos().add(new THREE.Vector3(0, 1, 0)), '打斷！', 'ft-big');
            }
            if (!this.enemyDead()) this.stunEnemy(0.6);
          }
        }
      } else {
        r.position.x += a.side * dt * 10;
        r.position.z += dt * 4;
        r.rotation.y = a.side > 0 ? Math.PI / 2 : -Math.PI / 2;
        this.animateLegs(a.rig, a.t * 25, 0.8);
      }
    }
    const gone = this.allies.filter(a => a.hit && Math.abs(a.rig.root.position.x) > 14);
    for (const g of gone) this.scene.remove(g.rig.root);
    this.allies = this.allies.filter(a => !gone.includes(a));
  }

  // ================= 視覺 =================

  private playerPos(yOff = 1.5): THREE.Vector3 {
    return new THREE.Vector3(this.p.x, yOff, this.p.z);
  }

  private enemyPos(yOff?: number): THREE.Vector3 {
    const y = yOff ?? this.enemyRig.height * this.cfg.enemy.scale * 0.6;
    return new THREE.Vector3(this.e.x, y, this.e.z + 1.2);
  }

  private shake(n: number) {
    this.shakeAmt = Math.max(this.shakeAmt, n);
  }

  private showBanner(text: string, sec: number) {
    this.banner = text;
    this.bannerT = sec;
  }

  private flashRig(rig: DinoRig, color: number) {
    for (const m of rig.materials) m.emissive.setHex(color);
    setTimeout(() => {
      if (this.disposed) return;
      for (const m of rig.materials) m.emissive.setHex(0x000000);
    }, 110);
  }

  private jawOpen(rig: DinoRig, amount: number) {
    rig.jaw.rotation.x += (amount * 0.6 - rig.jaw.rotation.x) * 0.5;
  }

  private animateLegs(rig: DinoRig, phase: number, amp: number) {
    rig.legs.forEach((leg, i) => {
      leg.rotation.x = Math.sin(phase + (i % 2) * Math.PI + Math.floor(i / 2) * 0.5) * amp;
    });
  }

  private getPartMat(color: number): THREE.MeshBasicMaterial {
    let m = this.partMats.get(color);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color, transparent: true });
      this.partMats.set(color, m);
    }
    return m;
  }

  private sparks(pos: THREE.Vector3, n: number, color: number) {
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(this.partGeo, this.getPartMat(color));
      mesh.position.copy(pos);
      this.scene.add(mesh);
      const vel = new THREE.Vector3(rand(-1, 1), rand(0.2, 1.4), rand(-1, 1)).normalize().multiplyScalar(rand(4, 10));
      this.particles.push({ mesh, vel, life: 0, max: rand(0.35, 0.7), spin: rand(5, 15), gravity: 18 });
    }
  }

  private dust(pos: THREE.Vector3, n: number) {
    const color = this.cfg.env === 'apocalypse' ? 0x5a4a40 : 0xcbb894;
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(this.partGeo, this.getPartMat(color));
      mesh.position.copy(pos).add(new THREE.Vector3(rand(-0.5, 0.5), 0, rand(-0.5, 0.5)));
      mesh.scale.setScalar(rand(1.2, 2.5));
      this.scene.add(mesh);
      const vel = new THREE.Vector3(rand(-2, 2), rand(0.5, 2.5), rand(-1, 2));
      this.particles.push({ mesh, vel, life: 0, max: rand(0.4, 0.8), spin: rand(1, 4), gravity: 2 });
    }
  }

  private ring(pos: THREE.Vector3, color: number, grow: number, max: number) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 0.9, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, 0.08, pos.z);
    this.scene.add(mesh);
    this.rings.push({ mesh, life: 0, max, grow });
  }

  private floatText(pos: THREE.Vector3, text: string, cls: string) {
    const el = document.createElement('div');
    el.className = `arena-float ${cls}`;
    el.textContent = text;
    this.overlay.appendChild(el);
    const jitter = new THREE.Vector3(rand(-0.4, 0.4), 0, 0);
    this.texts.push({ el, pos: pos.clone().add(jitter), life: 0, max: 0.9 });
  }

  private hideTelegraph() {
    for (const t of this.telegraphs) (t.material as THREE.MeshBasicMaterial).opacity = 0;
    for (const f of this.telegraphFills) (f.material as THREE.MeshBasicMaterial).opacity = 0;
    this.alertSprite.visible = false;
  }

  private updateVisuals(dt: number, realDt: number) {
    const e = this.e;
    const p = this.p;

    // 玩家模型
    const pr = this.player.root;
    pr.position.set(p.x, 0, p.z);
    const lean = p.dodgeT < 1 ? (p.lane * LANE_X - p.fromX) * -0.08 : 0;
    pr.rotation.z += (lean - pr.rotation.z) * Math.min(1, dt * 12);
    const moving = p.dodgeT < 1 || p.action === 'charge';
    this.animateLegs(this.player, this.time * (moving ? 22 : 4), moving ? 0.7 : 0.08);
    this.player.body.position.y = Math.sin(this.time * 3) * 0.04 - (p.action === 'charge_wind' ? 0.2 : 0);
    this.player.tail.forEach((t, i) => { t.rotation.y = Math.sin(this.time * 2.5 - i * 0.6) * 0.12; });
    if (p.action !== 'bite') this.jawOpen(this.player, 0);
    // 無敵時半透明閃爍
    const ghost = p.iframe > 0 ? 0.35 : 0;
    for (const m of this.player.materials) {
      m.transparent = ghost > 0;
      m.opacity = ghost > 0 ? 0.55 + Math.sin(this.time * 60) * 0.2 : 1;
    }

    // 敵人模型
    const er = this.enemyRig.root;
    if (e.state !== 'dead') {
      er.position.set(e.x, 0, e.z);
      let rearBack = 0;
      if (e.state === 'windup') {
        const k = e.t / e.dur;
        rearBack = k;
        // 蓄力抖動
        er.position.x += Math.sin(this.time * 50) * 0.04 * k;
        if (e.move === 'stomp') er.position.y = k * 0.8;
      } else if (e.state === 'attack' && e.move === 'stomp') {
        er.position.y = Math.max(0, 0.8 * (1 - e.t / e.dur * 2));
      } else {
        er.position.y = 0;
      }
      this.enemyRig.head.rotation.x = -rearBack * 0.35;
      this.enemyRig.jaw.rotation.x = e.state === 'windup' ? rearBack * 0.7 : e.state === 'attack' ? 0.1 : 0.05;
      if (e.state === 'attack' && e.move === 'sweep') {
        er.rotation.y = (e.t / e.dur) * Math.PI * 2;
      } else {
        er.rotation.y += (0 - er.rotation.y) * Math.min(1, dt * 10);
      }
      if (e.state === 'stunned') er.rotation.z = Math.sin(this.time * 10) * 0.08;
      else er.rotation.z *= 0.8;
      const eMoving = e.state === 'attack' || Math.abs(e.lane * LANE_X - e.x) > 0.2;
      this.animateLegs(this.enemyRig, this.time * (eMoving ? 20 : 3), eMoving ? 0.6 : 0.06);
      this.enemyRig.body.position.y = Math.sin(this.time * 2.5 + 1) * 0.05;
      this.enemyRig.tail.forEach((t, i) => {
        t.rotation.y = Math.sin(this.time * (e.enraged ? 5 : 2) - i * 0.6) * 0.15;
      });
    }
    // 受擊閃光 / 破綻高亮
    if (e.flash > 0) {
      e.flash -= realDt;
      for (const m of this.enemyRig.materials) m.emissive.setHex(e.flashColor);
    } else if (e.state === 'recover' && e.missed) {
      const g = 0.25 + Math.sin(this.time * 18) * 0.15;
      for (const m of this.enemyRig.materials) m.emissive.setRGB(g, g * 0.8, 0);
    } else if (e.state === 'stunned') {
      for (const m of this.enemyRig.materials) m.emissive.setRGB(0.1, 0.15, 0.35);
    } else {
      for (const m of this.enemyRig.materials) m.emissive.setHex(0x000000);
    }

    // 危險預警
    if (e.state === 'windup') {
      const k = Math.min(1, e.t / e.dur);
      for (let i = 0; i < 3; i++) {
        const lane = i - 1;
        const on = e.danger.includes(lane);
        (this.telegraphs[i].material as THREE.MeshBasicMaterial).opacity = on ? 0.22 + 0.14 * Math.sin(this.time * 20) + k * 0.25 : 0;
        const fill = this.telegraphFills[i];
        const len = 10.5 * k;
        fill.scale.set(1, len, 1);
        fill.position.z = -5.25 + len / 2;
        (fill.material as THREE.MeshBasicMaterial).opacity = on ? 0.5 : 0;
      }
      this.alertSprite.position.set(e.x, this.enemyRig.height * this.cfg.enemy.scale + 0.8 + Math.sin(this.time * 12) * 0.15, e.z);
      const s = 1.1 + e.t / e.dur * 0.8;
      this.alertSprite.scale.set(s, s, 1);
      // 快擊中時閃白——提示「現在閃避」
      const flashNow = e.dur - e.t < this.mods.perfect + 0.05;
      (this.alertSprite.material as THREE.SpriteMaterial).color.setHex(flashNow ? 0xffff66 : 0xffffff);
    } else if (e.state !== 'attack') {
      this.hideTelegraph();
    } else {
      for (const t of this.telegraphs) {
        const m = t.material as THREE.MeshBasicMaterial;
        m.opacity *= 0.8;
      }
    }

    // 粒子
    for (const pt of this.particles) {
      pt.life += dt;
      pt.vel.y -= pt.gravity * dt;
      pt.mesh.position.addScaledVector(pt.vel, dt);
      if (pt.mesh.position.y < 0.05) { pt.mesh.position.y = 0.05; pt.vel.multiplyScalar(0.5); }
      pt.mesh.rotation.x += pt.spin * dt;
      pt.mesh.rotation.y += pt.spin * dt;
      const k = 1 - pt.life / pt.max;
      pt.mesh.scale.setScalar(Math.max(0.01, k) * (pt.gravity < 5 ? 2 : 1));
    }
    const deadParts = this.particles.filter(pt => pt.life >= pt.max);
    for (const pt of deadParts) this.scene.remove(pt.mesh);
    this.particles = this.particles.filter(pt => pt.life < pt.max);

    for (const r of this.rings) {
      r.life += dt;
      const k = r.life / r.max;
      r.mesh.scale.setScalar(1 + k * r.grow);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
    }
    const deadRings = this.rings.filter(r => r.life >= r.max);
    for (const r of deadRings) {
      this.scene.remove(r.mesh);
      r.mesh.geometry.dispose();
      (r.mesh.material as THREE.Material).dispose();
    }
    this.rings = this.rings.filter(r => r.life < r.max);

    // 末日場景
    if (this.embers) {
      const arr = this.embers.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < arr.count; i++) {
        let y = arr.getY(i) + realDt * rand(0.5, 1.5);
        if (y > 20) y = 0;
        arr.setY(i, y);
      }
      arr.needsUpdate = true;
    }
    for (const m of this.meteors) {
      m.mesh.position.addScaledVector(m.vel, realDt * 2);
      if (m.mesh.position.y < -2) this.resetMeteor(m.mesh);
    }

    // 相機
    const camTarget = new THREE.Vector3(p.x * 0.4, 7.4, PLAYER_Z + 5.8);
    this.camera.position.lerp(camTarget, Math.min(1, realDt * 5));
    const lookAt = new THREE.Vector3((p.x + e.x) * 0.3, 0.9, -2.6);
    if (e.state === 'dead') {
      // K.O. 特寫
      const k = Math.min(1, e.t / 1.2);
      this.camera.position.lerp(new THREE.Vector3(e.x + 3, 3.5, e.z + 7), k * 0.08);
      lookAt.set(e.x, 1.2, e.z);
    }
    if (this.shakeAmt > 0) {
      this.camera.position.add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), 0).multiplyScalar(this.shakeAmt * 0.35));
      this.shakeAmt = Math.max(0, this.shakeAmt - realDt * 3);
    }
    this.camera.lookAt(lookAt);
    const baseFov = this.camera.aspect < 1 ? 70 : 50;
    this.camera.fov = baseFov + this.fovPunch * 10;
    this.fovPunch = Math.max(0, this.fovPunch - realDt * 3);
    this.camera.updateProjectionMatrix();

    // 飄字（DOM）
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    for (const t of this.texts) {
      t.life += realDt;
      const v = t.pos.clone().add(new THREE.Vector3(0, t.life * 1.6, 0)).project(this.camera);
      const x = (v.x * 0.5 + 0.5) * w;
      const y = (-v.y * 0.5 + 0.5) * h;
      const k = t.life / t.max;
      const pop = k < 0.15 ? 0.6 + k / 0.15 * 0.6 : 1.2 - Math.min(0.2, (k - 0.15));
      t.el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${pop})`;
      t.el.style.opacity = String(k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1);
    }
    const doneTexts = this.texts.filter(t => t.life >= t.max);
    for (const t of doneTexts) t.el.remove();
    this.texts = this.texts.filter(t => t.life < t.max);
  }

  // ================= 主迴圈 =================

  private update(realDt: number) {
    let dt = realDt;
    if (this.hitstop > 0) {
      this.hitstop -= realDt;
      dt = 0;
    } else if (this.slowmo > 0) {
      this.slowmo -= realDt;
      dt *= this.slowScale;
    }
    this.time += dt;

    if (!this.ended || this.e.state === 'dead') {
      this.updatePlayer(dt);
      this.updateEnemy(dt);
      this.updateAllies(dt);
    }
    this.updateVisuals(dt, realDt);

    if (this.bannerT > 0) {
      this.bannerT -= realDt;
      if (this.bannerT <= 0) this.banner = null;
    } else if (this.e.state !== 'countdown' && !this.ended) {
      this.banner = null;
    }

    if (this.ended && this.endTimer > 0) {
      this.endTimer -= realDt;
      if (this.endTimer <= 0 && this.outcome) this.cb.onEnd(this.outcome);
    }

    this.cb.onHud({
      playerHp: this.p.hp,
      stamina: this.p.stamina,
      enemyHp: this.e.hp,
      enemyMaxHp: this.e.maxHp,
      combo: this.p.comboTimer > 0 ? this.p.combo : 0,
      packCallsLeft: this.p.packCalls,
      roarsLeft: this.p.roars,
      flee: this.p.flee,
      enemyState: this.e.state,
      enraged: this.e.enraged,
      banner: this.banner,
      critReady: this.p.critBuff > 0,
      ended: this.ended,
    });
  }
}
