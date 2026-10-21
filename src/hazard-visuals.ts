import * as THREE from "three";
import type { CatalogAssets } from "./catalog-assets";
import { vaporPhase, type EnvironmentHazard } from "./environment-hazards";
/** Catalog meshes identify physical hazards; bounded particles are vapor effects only. */
export class HazardVisuals {
  private ready = false;
  private webs: { hazard: EnvironmentHazard; root: THREE.Group }[] = [];
  private mistTexture?: THREE.CanvasTexture;
  private vents: { hazard: EnvironmentHazard; mist: THREE.Points }[] = [];
  constructor(
    private scene: THREE.Scene,
    private catalog: CatalogAssets,
  ) {}
  initialize(hazards: EnvironmentHazard[]) {
    if (this.ready) return;
    this.ready = true;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const context = canvas.getContext("2d")!;
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, "rgba(255,255,255,0.8)");
    gradient.addColorStop(0.4, "rgba(255,255,255,0.35)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    this.mistTexture = new THREE.CanvasTexture(canvas);
    for (const h of hazards) {
      if (h.kind === "bones") {
        const pose = new THREE.Matrix4().makeTranslation(h.x, 0.025, h.z);
        this.catalog.scatter("dre_small_bone_pile", this.scene, [pose]);
      } else if (h.kind === "chains") {
        for (const offset of [-0.65, 0, 0.65])
          this.catalog.add(
            "dre_chain_short",
            this.scene,
            h.x + offset,
            0.8,
            h.z,
            1.6,
            0,
          );
      } else if (h.kind === "webs") {
        const root = new THREE.Group();
        root.position.set(h.x, 0, h.z);
        this.scene.add(root);
        this.catalog.batch(
          "dec_corner_cobweb",
          root,
          [new THREE.Matrix4().makeTranslation(0, 0.2, 0)],
          [2.3, 2, 0.22],
          () => {},
        );
        this.webs.push({ hazard: h, root });
      } else {
        this.catalog.batch(
          "pro_rubble",
          this.scene,
          [new THREE.Matrix4().makeTranslation(h.x, 0, h.z)],
          [2.2, 0.24, 2.2],
          () => {},
        );
        if (h.kind === "rubble") continue;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(new Float32Array(36 * 3), 3),
        );
        const mist = new THREE.Points(
          geometry,
          new THREE.PointsMaterial({
            color: 0x9cbdc8,
            size: 0.75,
            map: this.mistTexture,
            transparent: true,
            opacity: 0.2,
            depthWrite: false,
          }),
        );
        mist.position.set(h.x, 0, h.z);
        mist.frustumCulled = false;
        this.scene.add(mist);
        this.vents.push({ hazard: h, mist });
      }
    }
  }
  update(elapsed: number) {
    for (const { hazard, root } of this.webs) {
      root.visible = !hazard.burned;
      root.scale.y =
        1 - Math.min(0.85, ((hazard.burnProgress ?? 0) / 2) * 0.85);
    }
    for (const { hazard, mist } of this.vents) {
      const phase = vaporPhase(hazard, elapsed);
      (mist.material as THREE.PointsMaterial).opacity =
        phase === "active" ? 0.55 : phase === "warning" ? 0.28 : 0.09;
      const points = mist.geometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
      const height = phase === "active" ? 2 : phase === "warning" ? 0.7 : 0.25;
      for (let i = 0; i < points.count; i++) {
        const age =
          (elapsed * (phase === "active" ? 0.65 : 0.3) + i * 0.137) % 1;
        points.setXYZ(
          i,
          Math.sin(i * 2.4 + elapsed * 0.45) * (0.55 + age * 0.55),
          0.05 + age * height,
          Math.cos(i * 3.7 + elapsed * 0.35) * (0.55 + age * 0.55),
        );
      }
      points.needsUpdate = true;
    }
  }
}
