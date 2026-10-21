import * as THREE from "three";
import type { Brand } from "./brands";
import type { ExpeditionEncounterPlan } from "./expedition-encounter";
import type { CatalogAssets } from "./catalog-assets";

/** Shared dimensions for visible doorway and camera obstruction. The simulation
 * uses the same footprint: a closed shortcut cannot be walked through. */
export const SHORTCUT_GATE_SIZE = { width: 2.1, height: 2.3, depth: 0.8 };

export function brandGlow(remaining: number, elapsed: number) {
  const fade = THREE.MathUtils.clamp(remaining / 1.2, 0, 1);
  return (
    fade *
    (0.92 + Math.sin(elapsed * 21) * 0.05 + Math.sin(elapsed * 13) * 0.03)
  );
}

/** One preloaded torch, one non-shadow light, twelve reusable ember vertices.
 * Dropping a brand never requests a new model or allocates an effect. */
export class EncounterVisuals {
  readonly brand = new THREE.Group();
  readonly gate = new THREE.Group();
  landmarkCollider?: THREE.Mesh;
  readonly gateCollider = new THREE.Mesh(
    new THREE.BoxGeometry(
      SHORTCUT_GATE_SIZE.width,
      SHORTCUT_GATE_SIZE.height,
      SHORTCUT_GATE_SIZE.depth,
    ),
    new THREE.MeshBasicMaterial(),
  );
  private fire = new THREE.Points(
    new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(36), 3),
    ),
    new THREE.PointsMaterial({
      color: 0xffbb4f,
      size: 0.075,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  private light = new THREE.PointLight(0xff9f42, 0, 5, 1.6);
  private hardware: THREE.Group;
  private initialized = false;
  private opened = false;

  constructor(
    private scene: THREE.Scene,
    private catalog: CatalogAssets,
  ) {
    this.scene.add(this.brand, this.gate, this.gateCollider);
    this.gateCollider.visible = false;
    this.gate.visible = false;
    this.brand.visible = false;
    this.light.castShadow = false;
    this.light.position.set(-0.27, 0.26, 0);
    this.fire.position.copy(this.light.position);
    this.fire.frustumCulled = false;
    this.brand.add(this.fire, this.light);
    this.hardware = catalog.add("pro_torch", this.brand, 0, 0.13, 0, 1, 0);
    this.hardware.rotation.z = Math.PI / 2;
  }

  initialize(
    plan: ExpeditionEncounterPlan | undefined,
    decoration?: { x: number; z: number; yaw: number },
  ) {
    if (this.initialized) return;
    this.initialized = true;
    if (!plan) return;
    if (decoration) {
      this.landmarkCollider = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.2, 1.2),
        new THREE.MeshBasicMaterial(),
      );
      this.landmarkCollider.position.set(decoration.x, 0.6, decoration.z);
      this.landmarkCollider.rotation.y = decoration.yaw;
      this.landmarkCollider.visible = false;
      this.scene.add(this.landmarkCollider);
      this.landmarkCollider.updateMatrixWorld(true);
      this.catalog.batch(
        "lan_fallen_bell",
        this.scene,
        [
          new THREE.Matrix4()
            .makeTranslation(decoration.x, 0, decoration.z)
            .multiply(new THREE.Matrix4().makeRotationY(decoration.yaw)),
        ],
        [1.2, 1.2, 1.2],
        () => {},
      );
    }
    this.gate.position.set(plan.gate.x, 0, plan.gate.z);
    this.gate.rotation.y = plan.gate.yaw;
    this.gate.visible = true;
    this.gateCollider.position.set(
      plan.gate.x,
      SHORTCUT_GATE_SIZE.height / 2,
      plan.gate.z,
    );
    this.gateCollider.rotation.y = plan.gate.yaw;
    this.gateCollider.updateMatrixWorld(true);
    this.catalog.batch(
      "pro_crypt_door",
      this.gate,
      [new THREE.Matrix4()],
      [
        SHORTCUT_GATE_SIZE.width,
        SHORTCUT_GATE_SIZE.height,
        SHORTCUT_GATE_SIZE.depth,
      ],
      () => {},
    );
    // Chains belong to the moving seal, so their visible state always follows it.
    this.catalog.add("dre_chain_short", this.gate, -0.5, 1.05, -0.21, 0.75);
    this.catalog.add("dre_chain_short", this.gate, 0.5, 1.05, -0.21, 0.75);
  }

  /** Gate clears instantly on unlock; no invisible transition wall. */
  update(brands: readonly Brand[], open: boolean, elapsed: number) {
    const changed = this.opened !== open;
    this.opened = open;
    this.gate.visible =
      this.initialized && !open && this.gate.children.length > 0;
    const active = brands.find((brand) => brand.remaining > 0);
    this.brand.visible = !!active;
    this.light.intensity = active
      ? 3 * brandGlow(active.remaining, elapsed)
      : 0;
    if (active) {
      this.brand.position.set(active.x, 0, active.z);
      const socket = this.hardware.getObjectByName("flame_socket");
      if (socket) {
        this.hardware.updateMatrixWorld(true);
        socket.getWorldPosition(this.light.position);
        this.brand.worldToLocal(this.light.position);
        this.light.position.y = Math.max(0.12, this.light.position.y);
        this.fire.position.copy(this.light.position);
      }
      const vertices = this.fire.geometry.getAttribute("position");
      for (let index = 0; index < vertices.count; index++) {
        const age = (elapsed * 1.9 + index / vertices.count) % 1;
        vertices.setXYZ(
          index,
          Math.sin(index * 2.4 + elapsed * 3) * 0.035,
          age * 0.4,
          Math.cos(index * 1.7) * 0.035,
        );
      }
      vertices.needsUpdate = true;
      (this.fire.material as THREE.PointsMaterial).opacity = brandGlow(
        active.remaining,
        elapsed,
      );
    }
    return changed;
  }
}
