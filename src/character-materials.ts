import * as THREE from "three";

/** Cloth/skin should not inherit metallic authoring defaults or self-shadow acne. */
export function prepareCharacterSurface(mesh: THREE.Mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  for (const material of Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material]) {
    if (!(material instanceof THREE.MeshStandardMaterial)) continue;
    material.metalness = Math.min(material.metalness, 0.04);
    material.roughness = Math.max(material.roughness, 0.85);
  }
}
