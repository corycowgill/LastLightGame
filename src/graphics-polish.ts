import * as THREE from "three";
/** Reuses original embedded maps; adds relief without replacing any catalog mesh. */
export function polishCatalogSurface(id: string, material: THREE.Material) {
  if (!(material instanceof THREE.MeshStandardMaterial)) return;
  const iron = /chain|cage|lantern|iron/.test(id);
  const stone =
    id.startsWith("arc_") ||
    /pillar|sarcophagus|memorial|rubble|tomb|ossuary|bell/.test(id);
  if (iron) {
    material.metalness = 0.45;
    material.roughness = 0.62;
  } else if (stone) {
    material.metalness = 0.015;
    material.roughness = 0.87;
    if (material.map && !material.normalMap && !material.bumpMap) {
      material.bumpMap = material.map;
      material.bumpScale = 0.022;
    }
  } else if (/bone|skull|skeleton/.test(id)) {
    material.metalness = 0;
    material.roughness = 0.94;
  }
  if (material.map) material.map.anisotropy = 4;
}
/** Transparent analytic fire: bounded geometry, no compositor or extra light. */
export function createTorchFlame() {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(0.15, 0.19, 1, 8),
    new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      vertexShader: `varying vec2 flameUv; uniform float time;
  void main(){flameUv=uv;vec3 p=position;p.x+=sin(uv.y*8.0-time*11.0)*0.012*uv.y*uv.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
      fragmentShader: `varying vec2 flameUv;uniform float time;
  void main(){vec2 p=flameUv;float taper=mix(0.47,0.025,p.y);float sway=sin(p.y*9.0-time*11.0)*0.035*p.y;
  float edge=abs(p.x-0.5-sway)/taper;float body=(1.0-smoothstep(0.65,1.0,edge))*smoothstep(0.0,0.12,p.y)*(1.0-smoothstep(0.8,1.0,p.y));
  float core=(1.0-smoothstep(0.0,0.45,edge))*(1.0-p.y);vec3 fire=mix(vec3(1.0,0.16,0.015),vec3(1.0,0.66,0.10),1.0-p.y*0.6);fire=mix(fire,vec3(1.0,0.91,0.55),core);gl_FragColor=vec4(fire,body*0.94);}`,
    }),
  );
}
/**
 * Sanctuary fire: three crossed analytic flame layers plus a soft glow,
 * sharing the torch shader. Far larger than the torch so it reads as the
 * stable destination cue the art bible asks for.
 */
export function createSanctuaryFire(glow: THREE.Texture) {
  const group = new THREE.Group();
  const layers: THREE.Mesh[] = [];
  for (const [i, [w, h, x, phase]] of [
    [1.0, 1.0, 0, 0],
    [0.78, 0.82, -0.13, 1.7],
    [0.72, 0.76, 0.14, 3.1],
  ].entries()) {
    const flame = createTorchFlame();
    flame.scale.set(w * 5.2, h * 7.2, 1);
    flame.position.set(x, 0.62 * h, i * 0.01);
    flame.userData.phase = phase;
    flame.userData.base = flame.scale.clone();
    flame.renderOrder = 2;
    group.add(flame);
    layers.push(flame);
  }
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glow,
      color: 0xffb35c,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  );
  halo.scale.set(1.9, 1.5, 1);
  halo.position.y = 0.35;
  group.add(halo);
  return {
    group,
    update(elapsed: number, camera: THREE.Camera) {
      // Yaw-only billboard keeps the fire upright from any camera pitch.
      const world = group.getWorldPosition(new THREE.Vector3());
      group.rotation.y = Math.atan2(
        camera.position.x - world.x,
        camera.position.z - world.z,
      );
      for (const flame of layers) {
        const t = elapsed + flame.userData.phase;
        const base = flame.userData.base as THREE.Vector3;
        (flame.material as THREE.ShaderMaterial).uniforms.time.value = t * 0.8;
        flame.scale.set(
          base.x * (1 + 0.06 * Math.sin(t * 5.3)),
          base.y * (1 + 0.1 * Math.sin(t * 7.1) + 0.05 * Math.sin(t * 13)),
          1,
        );
      }
      halo.material.opacity = 0.5 + 0.08 * Math.sin(elapsed * 6.3);
    },
  };
}
/** Tileable ripple normals from a few interfering sine waves (no assets). */
export function createRippleNormals(size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const image = ctx.createImageData(size, size);
  const tau = Math.PI * 2;
  // Integer wave counts keep the field seamless across tile edges.
  const waves = [
    [3, 1, 0.5],
    [-2, 4, 0.35],
    [5, -3, 0.2],
    [1, 6, 0.15],
  ];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let dx = 0,
        dy = 0;
      for (const [kx, ky, a] of waves) {
        const phase = (tau * (kx * x + ky * y)) / size;
        dx += a * kx * Math.cos(phase);
        dy += a * ky * Math.cos(phase);
      }
      const n = new THREE.Vector3(-dx * 0.08, -dy * 0.08, 1).normalize();
      const i = (y * size + x) * 4;
      image.data[i] = (n.x * 0.5 + 0.5) * 255;
      image.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
      image.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
      image.data[i + 3] = 255;
    }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
/**
 * Warm pool of torchlight on the floor (art bible §7: a compact orange pool in
 * Ember, an amber key in Steady). One additive quad, no extra light: the torch
 * light itself stays flat near the hood so the ivory cloth never blows out.
 */
export function createTorchPool() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,196,120,0.95)");
  g.addColorStop(0.25, "rgba(255,150,70,0.62)");
  g.addColorStop(0.6, "rgba(214,91,39,0.22)");
  g.addColorStop(1, "rgba(214,91,39,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(c),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  (pool.material.map as THREE.Texture).colorSpace = THREE.SRGBColorSpace;
  pool.renderOrder = 1;
  return pool;
}
export class ContactShadows {
  private texture: THREE.CanvasTexture;
  private player: THREE.Mesh;
  private hunter: THREE.Mesh;
  constructor(scene: THREE.Scene) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, "rgba(0,0,0,0.65)");
    g.addColorStop(0.4, "rgba(0,0,0,0.35)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    this.texture = new THREE.CanvasTexture(c);
    const make = () => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1.35, 1.35),
        new THREE.MeshBasicMaterial({
          map: this.texture,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          toneMapped: false,
        }),
      );
      m.rotation.x = -Math.PI / 2;
      m.renderOrder = 1;
      scene.add(m);
      return m;
    };
    this.player = make();
    this.hunter = make();
  }
  update(
    player: { x: number; z: number },
    hunter: { x: number; z: number; state: string },
  ) {
    this.player.position.set(player.x, 0.025, player.z);
    this.hunter.position.set(hunter.x, 0.027, hunter.z);
    this.hunter.visible = !["DORMANT", "BANISHED"].includes(hunter.state);
  }
}

export function createEmberGlow() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.22, "rgba(255,220,150,0.8)");
  g.addColorStop(1, "rgba(255,160,30,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}
