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
