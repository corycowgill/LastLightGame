import { polishCatalogSurface } from "./graphics-polish";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { LoadQueue } from "./load-queue";
const NON_SHADOW_CASTERS = /^(arc_floor_2m|dre_crypt_skull|dec_corner_cobweb)$/;
const loads = new LoadQueue(2);

/** Shared decoded templates: one download per catalog ID, ownership per expedition. */
export class CatalogAssets {
  private templates = new Map<string, Promise<THREE.Group | undefined>>();
  private roots = new Set<THREE.Object3D>();
  private disposed = false;
  private manifest = fetch("/models/catalog/manifest.json", {
    cache: "no-cache",
  })
    .then((r) => (r.ok ? r.json() : { assets: [] }))
    .catch(() => ({ assets: [] }));
  loaded = 0;
  async ready() {
    await Promise.all([...this.templates.values()]);
  }

  add(
    id: string,
    parent: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0,
    scale = 1,
    rotation = 0,
    replace?: () => void,
  ) {
    const anchor = new THREE.Group();
    anchor.name = id;
    anchor.position.set(x, y, z);
    anchor.scale.setScalar(scale);
    anchor.rotation.y = rotation;
    parent.add(anchor);
    let template = this.templates.get(id);
    if (!template) {
      template = this.manifest.then(async (manifest) => {
        const entry = manifest.assets.find((a: { id: string }) => a.id === id);
        if (!entry || this.disposed) return undefined;
        try {
          const gltf = await loads.run(async () => {
            if (this.disposed) return undefined;
            return new GLTFLoader().loadAsync(
              `/models/catalog/${entry.file}?v=${entry.sha256}`,
            );
          });
          if (!gltf) return undefined;
          this.roots.add(gltf.scene);
          if (this.disposed) {
            this.release();
            return undefined;
          }
          gltf.scene.traverse((node) => {
            const mesh = node as THREE.Mesh;
            if (mesh.isMesh) {
              mesh.castShadow = !["pro_torch", "dec_corner_cobweb"].includes(
                id,
              );
              mesh.receiveShadow = true;
              for (const material of Array.isArray(mesh.material)
                ? mesh.material
                : [mesh.material])
                polishCatalogSurface(id, material);
              if (
                !/chain|cage|lantern|iron/.test(id) &&
                (id.startsWith("arc_") ||
                  (id.startsWith("lan_") && id !== "lan_fallen_bell") ||
                  id.startsWith("dre_") ||
                  [
                    "pro_pillar",
                    "pro_sarcophagus",
                    "pro_memorial",
                    "pro_rubble",
                  ].includes(id))
              ) {
                for (const material of Array.isArray(mesh.material)
                  ? mesh.material
                  : [mesh.material]) {
                  const stone = material as THREE.MeshStandardMaterial;
                  stone.metalness = Math.min(stone.metalness ?? 0, 0.08);
                  stone.roughness = Math.max(stone.roughness ?? 1, 0.85);
                }
              }
            }
          });
          this.loaded++;
          return gltf.scene;
        } catch (error) {
          console.warn(`Catalog model failed: ${id}`, error);
          return undefined;
        }
      });
      this.templates.set(id, template);
    }
    void template.then((root) => {
      if (!root || this.disposed) return;
      anchor.add(root.clone(true));
      replace?.();
      if (parent instanceof THREE.Scene) {
        anchor.updateMatrix();
        anchor.matrixAutoUpdate = false;
      }
    });
    return anchor;
  }

  /** Region batches keep neural masonry affordable without generating runtime geometry. */
  scatter(id: string, parent: THREE.Object3D, placements: THREE.Matrix4[]) {
    const holder = this.add(id, new THREE.Group(), 0, 0, 0, 1, 0, () => {
      if (this.disposed) return;
      if (id === "dre_small_bone_pile") holder.rotation.x = -Math.PI / 2;
      holder.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(holder);
      const offset = new THREE.Matrix4().makeTranslation(
        0,
        id === "dec_corner_cobweb"
          ? -bounds.getSize(new THREE.Vector3()).y / 2
          : -bounds.min.y,
        0,
      );
      const regions = new Map<string, THREE.Matrix4[]>();
      for (const pose of placements) {
        const key = `${Math.floor(pose.elements[12] / 28)},${Math.floor(pose.elements[14] / 28)}`;
        const region = regions.get(key) ?? [];
        region.push(pose);
        regions.set(key, region);
      }
      holder.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        for (const region of regions.values()) {
          const batch = new THREE.InstancedMesh(
            mesh.geometry,
            mesh.material,
            region.length,
          );
          region.forEach((pose, i) =>
            batch.setMatrixAt(
              i,
              pose.clone().multiply(offset).multiply(mesh.matrixWorld),
            ),
          );
          batch.name = id;
          batch.matrixAutoUpdate = false;
          // The reconstructed web has a solid backing: keep it from casting
          // a rectangular opaque shadow across the room.
          batch.castShadow = id !== "dec_corner_cobweb";
          batch.receiveShadow = true;
          batch.computeBoundingSphere();
          parent.add(batch);
        }
      });
    });
  }

  batch(
    id: string,
    parent: THREE.Object3D,
    placements: THREE.Matrix4[],
    dimensions: [number, number, number],
    replace: () => void,
    finish?: { tint: number; roughness: number },
  ) {
    const holder = this.add(id, new THREE.Group(), 0, 0, 0, 1, 0, () => {
      if (this.disposed) return;
      holder.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(holder),
        size = bounds.getSize(new THREE.Vector3()),
        center = bounds.getCenter(new THREE.Vector3());
      const fit = new THREE.Matrix4()
        .makeScale(
          dimensions[0] / size.x,
          dimensions[1] / size.y,
          dimensions[2] / size.z,
        )
        .multiply(
          new THREE.Matrix4().makeTranslation(
            -center.x,
            -bounds.min.y,
            -center.z,
          ),
        );
      const regions = new Map<string, THREE.Matrix4[]>();
      for (const placement of placements) {
        const key = `${Math.floor(placement.elements[12] / 28)},${Math.floor(placement.elements[14] / 28)}`;
        const list = regions.get(key) ?? [];
        list.push(placement);
        regions.set(key, list);
      }
      holder.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        let material = mesh.material;
        if (finish) {
          const adapt = (source: THREE.Material) => {
            const result = source.clone() as THREE.MeshStandardMaterial;
            result.color?.multiply(new THREE.Color(finish.tint));
            result.roughness = finish.roughness;
            return result;
          };
          material = Array.isArray(material)
            ? material.map(adapt)
            : adapt(material);
        }
        for (const region of regions.values()) {
          const instances = new THREE.InstancedMesh(
            mesh.geometry,
            material,
            region.length,
          );
          region.forEach((matrix, index) => {
            instances.setMatrixAt(
              index,
              matrix.clone().multiply(fit).multiply(mesh.matrixWorld),
            );
            if (id.startsWith("arc_")) {
              const position = new THREE.Vector3().setFromMatrixPosition(
                matrix,
              );
              const shade =
                0.66 +
                (Math.abs(Math.round(position.x * 17 + position.z * 31)) % 13) *
                  0.018;
              instances.setColorAt(
                index,
                new THREE.Color(shade * 0.91, shade * 0.97, shade),
              );
            }
          });
          // Floors and ceilings can never shadow anything visible, and skulls
          // and cobwebs are too small to read; skipping them keeps every point
          // light's six-face shadow passes for geometry that matters.
          instances.castShadow = !NON_SHADOW_CASTERS.test(id);
          instances.receiveShadow = true;
          instances.matrixAutoUpdate = false;
          instances.name = id;
          instances.computeBoundingSphere();
          parent.add(instances);
        }
      });
      replace();
    });
  }

  private release() {
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>(),
      textures = new Set<THREE.Texture>();
    for (const root of this.roots)
      root.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (mesh.geometry) geometries.add(mesh.geometry);
        if (mesh.material)
          for (const material of Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material])
            materials.add(material);
      });
    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) textures.add(value);
      });
      material.dispose();
    });
    geometries.forEach((geometry) => geometry.dispose());
    textures.forEach((texture) => texture.dispose());
    this.roots.clear();
  }
  dispose() {
    this.disposed = true;
    this.release();
    this.templates.clear();
  }
}
