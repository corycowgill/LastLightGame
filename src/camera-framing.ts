import * as THREE from "three";

/** Prefer a centered boom when the shoulder would hit a corridor wall first. */
export function shoulderOffset(
  anchor: THREE.Vector3,
  center: THREE.Vector3,
  right: THREE.Vector3,
  walls: THREE.Object3D[],
) {
  const clearance = (offset: THREE.Vector3) => {
    const ray = new THREE.Raycaster(
      anchor,
      offset.clone().normalize(),
      0,
      offset.length(),
    );
    return ray.intersectObjects(walls, false)[0]?.distance ?? offset.length();
  };
  const centered = clearance(center);
  const shoulder = center.clone().addScaledVector(right, 0.85);
  const available = clearance(shoulder);
  // Also center when the boom is compressed by an arch directly behind us.
  return (
    0.85 *
    THREE.MathUtils.smoothstep(available / shoulder.length(), 0.48, 0.95) *
    THREE.MathUtils.smoothstep(centered, 0.9, 2)
  );
}

/** Keep the hood from filling the view when solid geometry compresses the boom. */
export function compressedPlayerOpacity(distance: number) {
  return THREE.MathUtils.smoothstep(distance, 0.45, 1.7);
}

/** Own only character material clones; world, torch and other actors stay opaque. */
export class PlayerCameraFade {
  private materials: {
    material: THREE.Material;
    opacity: number;
    transparent: boolean;
    depthWrite: boolean;
  }[] = [];
  private opacity = 1;
  constructor(root: THREE.Object3D) {
    const clones = new Map<THREE.Material, THREE.Material>();
    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const clone = (source: THREE.Material) => {
        let material = clones.get(source);
        if (!material) {
          material = source.clone();
          material.onBeforeCompile = source.onBeforeCompile;
          material.customProgramCacheKey = source.customProgramCacheKey;
          clones.set(source, material);
          this.materials.push({
            material,
            opacity: source.opacity,
            transparent: source.transparent,
            depthWrite: source.depthWrite,
          });
        }
        return material;
      };
      node.material = Array.isArray(node.material)
        ? node.material.map(clone)
        : clone(node.material);
    });
    // The GLTF owns these original materials exclusively, before its first render.
    for (const source of clones.keys()) source.dispose();
  }
  update(opacity: number) {
    if (Math.abs(opacity - this.opacity) < 0.005) return;
    this.opacity = opacity;
    for (const entry of this.materials) {
      const fading = opacity < 0.995;
      const transparent = fading || entry.transparent;
      if (entry.material.transparent !== transparent) {
        entry.material.transparent = transparent;
        entry.material.needsUpdate = true;
      }
      entry.material.opacity = entry.opacity * opacity;
      entry.material.depthWrite = fading ? false : entry.depthWrite;
    }
  }
}
