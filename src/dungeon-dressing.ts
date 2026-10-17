import type { World } from "./simulation";
import * as THREE from "three";
import type { CatalogAssets } from "./catalog-assets";

export type Dressing = {
  id: string;
  x: number;
  y: number;
  z: number;
  scale: number;
  yaw: number;
};

/** Seeded environmental stories, outside the three-metre central walking lanes. */
export function dungeonDressing(world: World): Dressing[] {
  let state = (world.seed ^ 0x51ab739) >>> 0;
  const random = () =>
    (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
  const result: Dressing[] = [];
  for (const room of world.cells.filter(
    (c) => c.x % 14 === 0 && c.z % 14 === 0 && c.kind !== "corridor",
  )) {
    const x = room.x * 2,
      z = room.z * 2;
    const add = (
      id: string,
      dx: number,
      dy: number,
      dz: number,
      scale = 1,
      yaw = random() * Math.PI * 2,
    ) => result.push({ id, x: x + dx, y: dy, z: z + dz, scale, yaw });
    // Keep the sanctuary free of human remains around the safe flame.
    if (room.kind !== "sanctuary") {
      const side = random() < 0.5 ? -1 : 1;
      const offset = -4.2 + random() * 1.2;
      add("dre_small_bone_pile", side * 6.2, 0, offset, 1.3);
      add("dre_crypt_skull", side * 5.5, 0.02, offset + 0.5, 1);
      if (room.kind === "crypt" || room.kind === "landmark") {
        add("dre_small_bone_pile", -side * 6.6, 0, 4.7, 0.9);
        add("dre_crypt_skull", -side * 6.4, 0.03, 5.2, 0.85);
      }
      add("dre_chain_short", -side * 7.8, 2.3, -3.7, 1, 0.35);
      add(
        "dec_corner_cobweb",
        side * 8.6,
        3.1,
        offset - 0.4,
        2.4,
        (-side * Math.PI) / 2,
      );
    }
    // Torn webs accumulate above side recesses, never across camera-height passages.
    add("dec_corner_cobweb", -7.8, 2.75, -6.5, 1.4, Math.PI / 2);
    if (room.kind !== "sanctuary")
      add("dec_corner_cobweb", 6.2, 2.7, 8.5, 1.8, Math.PI);
    // Organic damp and soot decals break up the repeated masonry and floor.
    add("dec_damp", -8.75, 1.8, -3.5, 2.5, Math.PI / 2);
    add("dec_damp", 4.2, 1.4, 8.75, 2, Math.PI);
    add("dec_grime_floor", 5.8, 0.015, offsetForRoom(room.x, room.z), 2.4);
  }
  return result;
}
function offsetForRoom(x: number, z: number) {
  return ((x * 17 + z * 31) % 5) - 2;
}

export function dressDungeon(
  scene: THREE.Scene,
  catalog: CatalogAssets,
  world: World,
) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const web = new THREE.TextureLoader().load("/textures/corner-cobweb.png");
  web.colorSpace = THREE.SRGBColorSpace;
  const webMaterial = new THREE.MeshStandardMaterial({
    map: web,
    transparent: true,
    opacity: 0.65,
    alphaTest: 0.035,
    depthWrite: false,
    side: THREE.DoubleSide,
    roughness: 1,
  });
  webMaterial.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      "#include <color_fragment>\ndiffuseColor.rgb = vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))) * vec3(0.83, 0.85, 0.78);",
    );
  };
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(64, 64, 10, 64, 64, 63);
  gradient.addColorStop(0, "rgba(15,24,18,0.8)");
  gradient.addColorStop(0.45, "rgba(24,30,20,0.45)");
  gradient.addColorStop(1, "rgba(18,24,20,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  // Native material wear overlay: no replacement mesh is synthesized here.
  const grime = new THREE.CanvasTexture(canvas);
  const dampMaterial = new THREE.MeshStandardMaterial({
    map: grime,
    transparent: true,
    depthWrite: false,
    roughness: 0.5,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  for (const detail of dungeonDressing(world)) {
    if (!detail.id.startsWith("dec_")) {
      const anchor = catalog.add(
        detail.id,
        scene,
        detail.x,
        detail.y,
        detail.z,
        detail.scale,
        detail.yaw,
        () => {
          if (detail.id === "dre_small_bone_pile") {
            anchor.updateMatrixWorld(true);
            const bounds = new THREE.Box3().setFromObject(anchor);
            anchor.position.y -= bounds.min.y;
          }
        },
      );
      if (detail.id === "dre_small_bone_pile") anchor.rotation.x = -Math.PI / 2;
      continue;
    }
    const plane = new THREE.Mesh(
      geometry,
      detail.id === "dec_corner_cobweb" ? webMaterial : dampMaterial,
    );
    plane.name = detail.id;
    plane.position.set(detail.x, detail.y, detail.z);
    plane.scale.set(
      detail.scale,
      detail.scale * (detail.id === "dec_damp" ? 1.6 : 1),
      1,
    );
    plane.rotation.y = detail.yaw;
    if (detail.id === "dec_grime_floor")
      plane.rotation.set(-Math.PI / 2, 0, detail.yaw);
    scene.add(plane);
  }
}
