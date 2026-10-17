import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { AnimatedCharacter, movementClip } from "./character";
import * as THREE from "three";
import type { World, Game } from "./simulation";
export function constrainCamera(
  anchor: THREE.Vector3,
  desired: THREE.Vector3,
  walls: THREE.Object3D[],
) {
  const delta = desired.clone().sub(anchor),
    ray = new THREE.Raycaster(
      anchor,
      delta.clone().normalize(),
      0,
      delta.length(),
    );
  const hit = ray.intersectObjects(walls, false)[0];
  return hit
    ? anchor.clone().add(delta.setLength(Math.max(0.15, hit.distance - 0.25)))
    : desired.clone();
}
export class GameScene {
  readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  private scene = new THREE.Scene();
  private ambient = new THREE.HemisphereLight(0x8098bc, 0x182031, 0.65);
  private camera = new THREE.PerspectiveCamera(57, 1, 0.08, 100);
  private player = new THREE.Group();
  private hunter = new THREE.Group();
  private stalker = new THREE.Group();
  private torch = new THREE.PointLight(0xffa347, 28, 18, 1.5);
  private flame: THREE.Mesh;
  private torchBasket = new THREE.Group();
  private walls: THREE.Object3D[] = [];
  private boxes: THREE.Mesh[] = [];
  private items = new Map<string, THREE.Object3D>();
  private chalk = new THREE.Group();
  private particles: THREE.Points;
  private ray = new THREE.Raycaster();
  private target = new THREE.Vector3();
  private actor?: AnimatedCharacter;
  private hunterActor?: AnimatedCharacter;
  private lastHunterState = "DORMANT";
  private banishTime = 0;
  private lastMessage = "";
  private gesture = "";
  private gestureTime = 0;
  private stick?: THREE.Mesh;
  private socketPoint = new THREE.Vector3();
  private initialized = false;
  private elapsed = 0;
  private lastFuel = 720;
  private burst = 0;
  constructor(
    private container: HTMLElement,
    world: World,
  ) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.setClearColor(0x070d17);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.scene.fog = new THREE.FogExp2(0x101a2a, 0.038);
    this.scene.add(this.ambient);
    const stone = new THREE.MeshStandardMaterial({
        color: 0x59636b,
        roughness: 0.96,
      }),
      trim = new THREE.MeshStandardMaterial({
        color: 0x92958c,
        roughness: 0.9,
      }),
      floor = new THREE.MeshStandardMaterial({ color: 0x303944, roughness: 1 }),
      bronze = new THREE.MeshStandardMaterial({
        color: 0x936238,
        metalness: 0.55,
        roughness: 0.5,
      });
    const masonry = this.texture(world.seed, false),
      slabs = this.texture(world.seed + 11, true);
    stone.map = masonry;
    stone.bumpMap = masonry;
    stone.bumpScale = 0.055;
    floor.map = slabs;
    floor.bumpMap = slabs;
    floor.bumpScale = 0.025;
    const occupied = new Set(world.cells.map((c) => `${c.x},${c.z}`)),
      dummy = new THREE.Object3D();
    const blockMatrices: THREE.Matrix4[] = [];
    const floors = new THREE.InstancedMesh(
      new RoundedBoxGeometry(1.98, 0.18, 1.98, 1, 0.035),
      floor,
      world.cells.length,
    );
    world.cells.forEach((c, i) => {
      dummy.scale.set(1, 1, 1);
      dummy.position.set(c.x * 2, -0.12, c.z * 2);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      floors.setMatrixAt(i, dummy.matrix);
      const color = new THREE.Color(c.kind === "flooded" ? 0x425960 : 0x58616a);
      color.multiplyScalar(
        0.75 + (((c.x * 17 + c.z * 31 + world.seed) >>> 0) % 11) * 0.025,
      );
      floors.setColorAt(i, color);
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        if (occupied.has(`${c.x + dx},${c.z + dz}`)) continue;
        const wall = this.box(
          0.26,
          4,
          2,
          stone,
          c.x * 2 + dx,
          c.z * 2 + dz,
          1.9,
        );
        if (dz) wall.rotation.y = Math.PI / 2;
        this.walls.push(wall);
        for (let row = 0; row < 4; row++) {
          const course =
            row % 2
              ? [
                  [-0.75, 0.44],
                  [0, 0.94],
                  [0.75, 0.44],
                ]
              : [
                  [-0.49, 0.94],
                  [0.49, 0.94],
                ];
          for (const [along, width] of course) {
            dummy.position.set(
              c.x * 2 + dx + (dz ? along : 0),
              row * 0.98 + 0.46,
              c.z * 2 + dz + (dx ? along : 0),
            );
            dummy.scale.set(1, 1, width / 0.94);
            dummy.rotation.set(0, dz ? Math.PI / 2 : 0, 0);
            dummy.updateMatrix();
            blockMatrices.push(dummy.matrix.clone());
          }
        }
        if (((c.x * 17 + c.z * 31 + world.seed) >>> 0) % 5 === 0) {
          const tomb = this.box(
            0.6,
            0.5,
            1.1,
            stone,
            c.x * 2 + dx * 0.5,
            c.z * 2 + dz * 0.5,
            0.25,
          );
          tomb.rotation.y = (c.x + c.z) * 0.2;
        }
      }
      if (c.x % 14 === 0 && c.z % 14 === 0) {
        this.roomDetails(c.x * 2, c.z * 2, c.kind, stone, trim, bronze);
      }
    });
    const blockMaterial = new THREE.MeshStandardMaterial({
      color: 0x59636b,
      roughness: 0.92,
      bumpMap: slabs,
      bumpScale: 0.06,
    });
    const blocks = new THREE.InstancedMesh(
      new RoundedBoxGeometry(0.31, 0.94, 0.94, 1, 0.045),
      blockMaterial,
      blockMatrices.length,
    );
    blockMatrices.forEach((matrix, i) => {
      blocks.setMatrixAt(i, matrix);
      blocks.setColorAt(
        i,
        new THREE.Color().setScalar(0.63 + ((i * 17 + world.seed) % 23) / 65),
      );
    });
    blocks.castShadow = blocks.receiveShadow = true;
    blocks.computeBoundingSphere();
    this.scene.add(blocks);
    dummy.scale.set(1, 1, 1);
    floors.receiveShadow = true;
    this.scene.add(floors);
    const ceiling = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.98, 0.12, 1.98),
      stone,
      world.cells.length,
    );
    world.cells.forEach((c, i) => {
      dummy.position.set(c.x * 2, 4.05, c.z * 2);
      dummy.updateMatrix();
      ceiling.setMatrixAt(i, dummy.matrix);
    });
    this.scene.add(ceiling);
    this.batchBoxes();
    for (const point of [world.start, world.exit]) {
      const x = point.x * 2,
        z = point.z * 2;
      const basin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.3, 0.6, 10),
        bronze,
      );
      basin.position.set(x, 0.3, z);
      this.scene.add(basin);
      const fire = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.35, 1),
        new THREE.MeshBasicMaterial({ color: 0xffc677 }),
      );
      fire.position.set(x, 1, z);
      fire.scale.y = 2;
      this.scene.add(fire);
      const light = new THREE.PointLight(0xffb85b, 36, 21, 1.6);
      light.position.set(x, 1.6, z);
      this.scene.add(light);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.05, 0.025, 5, 40),
        new THREE.MeshBasicMaterial({ color: 0x6d9da4 }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.005, z);
      this.scene.add(ring);
    }
    const cloak = new THREE.MeshStandardMaterial({
      color: 0x96703d,
      roughness: 0.95,
    });
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.05, 9), cloak);
    body.position.y = 0.72;
    body.castShadow = true;
    this.player.add(body);
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), cloak);
    hood.position.set(0, 1.35, 0);
    this.player.add(hood);
    const face = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x100e13 }),
    );
    face.position.set(0, 1.34, -0.13);
    face.scale.z = 0.5;
    this.player.add(face);
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.06, 0.4, 6),
        bronze,
      );
      leg.position.set(side * 0.13, 0.2, 0);
      leg.name = "leg";
      this.player.add(leg);
      const shoulder = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 8, 6),
        cloak,
      );
      shoulder.position.set(side * 0.29, 1.02, 0);
      this.player.add(shoulder);
    }
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.045, 0.7, 6),
      bronze,
    );
    this.stick = stick;
    stick.position.set(0.43, 1.17, -0.18);
    stick.rotation.z = -0.15;
    this.player.add(stick);
    this.flame = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.105, 1),
      new THREE.MeshBasicMaterial({ color: 0xffd58a }),
    );
    const iron = new THREE.MeshStandardMaterial({
      color: 0x292a2b,
      metalness: 0.8,
      roughness: 0.7,
    });
    for (const y of [-0.17, -0.025]) {
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.095, 0.012, 5, 12),
        iron,
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = y;
      this.torchBasket.add(rim);
    }
    for (let i = 0; i < 5; i++) {
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.009, 0.18, 5),
        iron,
      );
      bar.position.set(
        Math.cos((i * Math.PI * 2) / 5) * 0.09,
        -0.09,
        Math.sin((i * Math.PI * 2) / 5) * 0.09,
      );
      this.torchBasket.add(bar);
    }
    this.player.add(this.torchBasket);
    this.flame.position.set(0.48, 1.58, -0.18);
    this.flame.scale.y = 2.2;
    this.player.add(this.flame);
    this.torch.position.copy(this.flame.position);
    this.torch.castShadow = true;
    this.torch.shadow.mapSize.set(512, 512);
    this.torch.shadow.bias = -0.002;
    this.player.add(this.torch);
    this.scene.add(this.player);
    const shadow = new THREE.MeshStandardMaterial({
      color: 0x060810,
      roughness: 1,
    });
    const torso = new THREE.Mesh(new THREE.ConeGeometry(0.38, 2.6, 7), shadow);
    torso.position.y = 1.35;
    this.hunter.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), shadow);
    head.position.y = 2.7;
    this.hunter.add(head);
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.025, 1.7, 5),
        shadow,
      );
      arm.position.set(side * 0.49, 1.6, 0);
      arm.rotation.z = side * 0.2;
      this.hunter.add(arm);
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.033, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xb6dfdb }),
      );
      eye.position.set(side * 0.075, 2.73, -0.17);
      this.hunter.add(eye);
    }
    const stalkerBody = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.45, 0),
      new THREE.MeshStandardMaterial({ color: 0x43424c, roughness: 1 }),
    );
    stalkerBody.scale.set(0.7, 0.7, 1.5);
    stalkerBody.position.y = 0.6;
    this.stalker.add(stalkerBody);
    for (const s of [-1, 1])
      for (const z of [-0.4, 0.4]) {
        const limb = new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.025, 0.7, 5),
          shadow,
        );
        limb.position.set(s * 0.4, 0.35, z);
        limb.rotation.z = s * 0.4;
        this.stalker.add(limb);
      }
    this.scene.add(this.hunter, this.chalk, this.stalker);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(100 * 3), 3),
    );
    this.particles = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0xffc06a,
        size: 0.035,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.player.add(this.particles);
    const playerFallback = this.player.children.filter(
      (c) =>
        c !== this.flame &&
        c !== this.torch &&
        c !== this.particles &&
        c !== this.torchBasket &&
        c !== this.stick,
    );
    this.actor = new AnimatedCharacter("/models/torchbearer.glb", () => {
      playerFallback.forEach((c) => (c.visible = false));
      this.container.dataset.character = "rigged";
    });
    this.player.add(this.actor.root);
    const hunterFallback = [...this.hunter.children];
    this.hunterActor = new AnimatedCharacter("/models/hunter.glb", () =>
      hunterFallback.forEach((c) => (c.visible = false)),
    );
    this.hunter.add(this.hunterActor.root);
    this.resize();
  }
  private texture(seed: number, slabs: boolean) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const c = canvas.getContext("2d")!;
    let state = seed >>> 0;
    const random = () =>
      (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
    c.fillStyle = "#343b45";
    c.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 4; row++)
      for (let col = -1; col < 3; col++) {
        const x = col * 128 + (row % 2 ? 64 : 0),
          y = row * 64,
          n = 48 + Math.floor(random() * 25);
        c.fillStyle = `rgb(${n},${n + 5},${n + 11})`;
        c.fillRect(x + 2, y + 2, 124, 60);
        c.strokeStyle = "#79818a";
        c.globalAlpha = 0.16;
        c.strokeRect(x + 4, y + 4, 120, 56);
        c.globalAlpha = 1;
      }
    for (let i = 0; i < 9000; i++) {
      const n = random() * 120;
      c.fillStyle = `rgba(${n},${n},${n},.12)`;
      c.fillRect(random() * 256, random() * 256, 1 + random() * 2, 1);
    }
    if (slabs) {
      c.strokeStyle = "#18222b";
      c.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        c.beginPath();
        let x = random() * 256,
          y = random() * 256;
        c.moveTo(x, y);
        for (let j = 0; j < 4; j++) {
          x += random() * 20 - 10;
          y += random() * 24;
          c.lineTo(x, y);
        }
        c.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }
  private box(
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
    x: number,
    z: number,
    y: number,
  ) {
    const mesh = new THREE.Mesh(
      new RoundedBoxGeometry(w, h, d, 1, Math.min(0.045, w / 5, h / 5, d / 5)),
      material,
    );
    mesh.userData.batchKey = `${w},${h},${d}`;
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.boxes.push(mesh);
    return mesh;
  }
  private batchBoxes() {
    const groups = new Map<string, THREE.Mesh[]>();
    for (const box of this.boxes) {
      const k = `${box.userData.batchKey},${(box.material as THREE.Material).uuid}`;
      const list = groups.get(k) || [];
      list.push(box);
      groups.set(k, list);
    }
    for (const list of groups.values()) {
      const instance = new THREE.InstancedMesh(
        list[0].geometry,
        list[0].material,
        list.length,
      );
      list.forEach((mesh, i) => {
        mesh.updateMatrixWorld(true);
        instance.setMatrixAt(i, mesh.matrixWorld);
        this.scene.remove(mesh);
      });
      instance.castShadow = instance.receiveShadow = true;
      instance.computeBoundingSphere();
      this.scene.add(instance);
    }
    this.boxes = [];
  }
  private roomDetails(
    x: number,
    z: number,
    kind: string,
    stone: THREE.Material,
    trim: THREE.Material,
    bronze: THREE.Material,
  ) {
    // Decorative pillars stay against room boundaries, away from the navigation floor.
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const p = new THREE.Mesh(
          new THREE.CylinderGeometry(0.34, 0.46, 3.8, 8),
          trim,
        );
        p.position.set(x + sx * 7.8, 1.8, z + sz * 7.8);
        p.castShadow = true;
        this.scene.add(p);
        this.box(1, 0.2, 1, stone, x + sx * 7.8, z + sz * 7.8, 3.6);
      }
    for (const side of [-1, 1]) {
      for (let i = 0; i < 13; i++) {
        const angle = ((i + 0.5) * Math.PI) / 13;
        const voussoir = this.box(
          0.49,
          0.45,
          0.62,
          trim,
          x + Math.cos(angle) * 2.1,
          z + side * 7.7,
          1.7 + Math.sin(angle) * 2.1,
        );
        voussoir.rotation.z = angle - Math.PI / 2;
      }
      for (const sx of [-1, 1])
        this.box(0.48, 1.8, 0.5, trim, x + sx * 2.1, z + side * 7.7, 0.8);
    }
    if (kind === "archive") {
      for (const side of [-1, 1])
        for (let i = -2; i <= 2; i++) {
          this.box(0.4, 2.4, 1.5, bronze, x + side * 8.5, z + i * 2.7, 1.1);
          for (let y = 0.3; y < 2.2; y += 0.5)
            this.box(0.45, 0.08, 1.5, trim, x + side * 8.5, z + i * 2.7, y);
        }
    } else if (kind === "crypt") {
      for (const side of [-1, 1])
        for (let i = -2; i <= 2; i++) {
          this.box(1, 0.7, 1.8, stone, x + side * 8, z + i * 2.7, 0.3);
          this.box(1.12, 0.12, 1.9, trim, x + side * 8, z + i * 2.7, 0.7);
        }
    } else if (kind === "landmark") {
      const obelisk = new THREE.Mesh(new THREE.ConeGeometry(0.6, 3, 4), trim);
      obelisk.position.set(x + 7.8, 1.5, z);
      this.scene.add(obelisk);
      const rune = new THREE.Mesh(
        new THREE.TorusGeometry(0.35, 0.025, 4, 24),
        new THREE.MeshBasicMaterial({ color: 0x83a8b0 }),
      );
      rune.position.set(x + 7.2, 1.7, z);
      rune.rotation.y = Math.PI / 2;
      this.scene.add(rune);
    }
  }
  setQuality(low: boolean) {
    this.renderer.setPixelRatio(low ? 1 : Math.min(devicePixelRatio, 1.6));
    this.renderer.shadowMap.enabled = !low;
    this.resize();
  }
  update(game: Game, dt: number, yaw: number, pitch: number, distance = 3.7) {
    this.elapsed += dt;
    const previous = this.player.position.clone();
    this.player.position.set(game.player.x, 0, game.player.z);
    const moving = previous.distanceTo(this.player.position) > 0.001;
    this.player.rotation.y = game.player.yaw || 0;
    this.player.scale.y = this.actor?.ready
      ? 1
      : game.player.crouched
        ? 0.72
        : 1;
    const speed = dt > 0 ? previous.distanceTo(this.player.position) / dt : 0;
    this.gestureTime = Math.max(0, this.gestureTime - dt);
    if (game.message !== this.lastMessage) {
      this.lastMessage = game.message;
      const clip = game.message.startsWith("Chalk remembers")
        ? "chalk"
        : game.message.startsWith("Oil recovered")
          ? "refill"
          : game.message.startsWith("An ancient relic") ||
              game.message.startsWith("A dry match")
            ? "interact"
            : "";
      if (clip) {
        this.gesture = clip;
        this.gestureTime = 0.85;
      }
    }
    if (this.lastFuel - game.fuel > 35) {
      this.gesture = "burst";
      this.gestureTime = 0.7;
    }
    this.actor?.update(
      game.phase === "DEAD"
        ? "death"
        : game.phase === "RELIGHTING"
          ? "relight"
          : game.phase === "EXTINGUISHING"
            ? "extinguish"
            : this.gestureTime > 0
              ? this.gesture
              : movementClip(game.player.crouched, speed),
      dt,
    );
    this.container.dataset.animation = this.actor?.clip ?? "fallback";
    this.player.updateMatrixWorld(true);
    if (this.actor?.ready && this.actor.socket) {
      this.actor.socket.getWorldPosition(this.socketPoint);
      this.player.worldToLocal(this.socketPoint);
      this.flame.position
        .copy(this.socketPoint)
        .add(new THREE.Vector3(0, 0.46, 0));
      this.torch.position.copy(this.flame.position);
      this.stick?.position
        .copy(this.socketPoint)
        .add(new THREE.Vector3(0, 0.12, 0));
    }
    this.player.children
      .filter((c) => c.name === "leg")
      .forEach((c, i) => {
        c.rotation.x = moving
          ? Math.sin(this.elapsed * 12 + i * Math.PI) * 0.5
          : 0;
      });
    this.torchBasket.position.copy(this.flame.position);
    const burning =
      game.fuel > 0 && ["EXPLORING", "SANCTUARY"].includes(game.phase);
    if (this.lastFuel - game.fuel > 35) this.burst = 1;
    this.lastFuel = game.fuel;
    this.burst = Math.max(0, this.burst - dt * 2);
    this.ambient.intensity = THREE.MathUtils.damp(
      this.ambient.intensity,
      burning ? 0.65 : 0.3,
      2,
      dt,
    );
    (this.scene.fog as THREE.FogExp2).density = THREE.MathUtils.damp(
      (this.scene.fog as THREE.FogExp2).density,
      burning ? 0.038 : 0.085,
      2,
      dt,
    );
    const radius = [3, 9, 20][game.mode] || 9,
      intensity = [10, 26, 64][game.mode] || 35;
    this.torch.intensity = THREE.MathUtils.damp(
      this.torch.intensity,
      burning
        ? intensity *
            (1 +
              (game.fuel / game.maxFuel < 0.25 ? 0.18 : 0.06) *
                Math.sin(this.elapsed * 19) +
              0.04 * Math.sin(this.elapsed * 31)) +
            this.burst * 180
        : 0,
      8,
      dt,
    );
    this.torch.distance = radius + this.burst * 10;
    this.flame.visible = burning;
    this.flame.scale.set(
      1 + 0.15 * Math.sin(this.elapsed * 21),
      2.1 + 0.3 * Math.sin(this.elapsed * 15),
      1,
    );
    this.flame.rotation.y = this.elapsed * 2;
    if (
      game.hunter.state === "BANISHED" &&
      !["BANISHED", "DORMANT"].includes(this.lastHunterState)
    )
      this.banishTime = 1.2;
    this.lastHunterState = game.hunter.state;
    this.banishTime = Math.max(0, this.banishTime - dt);
    this.hunter.visible =
      !["DORMANT", "BANISHED"].includes(game.hunter.state) ||
      this.banishTime > 0;
    this.hunter.scale.setScalar(
      this.banishTime > 0 ? Math.min(1, this.banishTime / 0.8) : 1,
    );
    this.hunterActor?.update(
      game.phase === "DEAD"
        ? "capture"
        : this.banishTime > 0
          ? "banish"
          : game.hunter.state === "PURSUING"
            ? "pursue"
            : "search",
      dt,
    );
    if (this.hunter.visible) {
      this.hunter.position.set(
        game.hunter.x,
        0.04 * Math.sin(this.elapsed * 7),
        game.hunter.z,
      );
      this.hunter.lookAt(game.player.x, this.hunter.position.y, game.player.z);
      this.hunter.rotation.y += Math.PI;
    }
    const e = game.enemies?.[0];
    this.stalker.visible = !!e;
    if (e) {
      this.stalker.position.set(e.x, Math.sin(this.elapsed * 4) * 0.02, e.z);
      this.stalker.lookAt(game.player.x, 0, game.player.z);
    }
    for (const item of game.items || []) {
      let mesh = this.items.get(String(item.id));
      if (!mesh) {
        const artifact = item.kind === "artifact";
        mesh = new THREE.Mesh(
          artifact
            ? new THREE.OctahedronGeometry(0.22)
            : new THREE.CylinderGeometry(0.12, 0.14, 0.33, 8),
          new THREE.MeshStandardMaterial({
            color: artifact ? 0xb49cd3 : 0xba8a47,
            emissive: artifact ? 0x49315e : 0x362008,
            emissiveIntensity: 0.7,
            metalness: 0.5,
            roughness: 0.35,
          }),
        );
        this.items.set(String(item.id), mesh);
        this.scene.add(mesh);
      }
      mesh.visible = !item.taken;
      mesh.position.set(
        item.x,
        0.37 + Math.sin(this.elapsed * 2 + item.x) * 0.045,
        item.z,
      );
      mesh.rotation.y = this.elapsed * 0.45;
    }
    while (this.chalk.children.length < (game.chalk || []).length) {
      const mark = new THREE.Mesh(
        new THREE.TorusGeometry(0.16, 0.02, 4, 12),
        new THREE.MeshBasicMaterial({ color: 0xb4d1d1 }),
      );
      mark.rotation.x = -Math.PI / 2;
      this.chalk.add(mark);
    }
    (game.chalk || []).forEach((c: any, i: number) =>
      this.chalk.children[i].position.set(c.x, 0.012, c.z),
    );
    const particles = this.particles.geometry.attributes
      .position as THREE.BufferAttribute;
    for (let i = 0; i < 100; i++) {
      const t = (this.elapsed * (0.4 + (i % 3) * 0.1) + i * 0.137) % 1;
      particles.setXYZ(
        i,
        this.flame.position.x + Math.sin(i * 7 + t * 5) * t * 0.35,
        this.flame.position.y + t * 1.4,
        this.flame.position.z + Math.cos(i * 11 + t * 5) * t * 0.35,
      );
    }
    particles.needsUpdate = true;
    this.particles.visible = burning;
    const anchor = new THREE.Vector3(game.player.x, 1.25, game.player.z),
      elevation = THREE.MathUtils.clamp(pitch, -0.35, 1.05),
      arm = THREE.MathUtils.clamp(distance, 1.6, 6.5),
      offset = new THREE.Vector3(
        Math.sin(yaw) * Math.cos(elevation) * arm,
        Math.sin(elevation) * arm,
        Math.cos(yaw) * Math.cos(elevation) * arm,
      );
    this.ray.set(anchor, offset.clone().normalize());
    this.ray.far = offset.length();
    const hit = this.ray.intersectObjects(this.walls, false)[0];
    if (hit) offset.setLength(Math.max(0.4, hit.distance - 0.25));
    const desired = anchor.clone().add(offset);
    desired.y = THREE.MathUtils.clamp(desired.y, 0.35, 3.7);
    if (!this.initialized) {
      this.camera.position.copy(desired);
      this.initialized = true;
    } else this.camera.position.lerp(desired, 1 - Math.exp(-dt * 12));
    // Recheck the interpolated camera too: smoothing must not cross a wall at corners.
    this.camera.position.copy(
      constrainCamera(anchor, this.camera.position, this.walls),
    );
    this.target.copy(anchor);
    this.target.y += 0.05;
    this.camera.lookAt(this.target);
    this.renderer.render(this.scene, this.camera);
  }
  resize() {
    const w = Math.max(1, this.container.clientWidth),
      h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 76 : 57;
    this.camera.updateProjectionMatrix();
  }
  dispose() {
    this.actor?.dispose();
    this.hunterActor?.dispose();
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) geometries.add(m.geometry);
      if (m.material)
        (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) =>
          materials.add(x),
        );
    });
    this.walls.forEach((o) => geometries.add((o as THREE.Mesh).geometry));
    geometries.forEach((g) => g.dispose());
    const textures = new Set<THREE.Texture>();
    materials.forEach((m) => {
      const standard = m as THREE.MeshStandardMaterial;
      if (standard.map) textures.add(standard.map);
      if (standard.bumpMap) textures.add(standard.bumpMap);
      m.dispose();
    });
    textures.forEach((t) => t.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
