/** Finish rebuilt player/torch contracts without changing generated geometry. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const [playerPath, torchPath, destination] = process.argv.slice(2);
if (!destination)
  throw new Error("Usage: finish_rebuilt_player.ts PLAYER TORCH OUTPUT_DIR");
const unpack = (bytes: Buffer) => ({
  doc: JSON.parse(bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12))),
  binary: bytes.subarray(28 + bytes.readUInt32LE(12)),
});
function pack(doc: any, binary: Buffer) {
  const raw = Buffer.from(JSON.stringify(doc));
  const json = Buffer.concat([
    raw,
    Buffer.alloc((4 - (raw.length % 4)) % 4, 32),
  ]);
  const head = Buffer.alloc(20);
  head.write("glTF");
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(28 + json.length + binary.length, 8);
  head.writeUInt32LE(json.length, 12);
  head.writeUInt32LE(0x4e4f534a, 16);
  const tail = Buffer.alloc(8);
  tail.writeUInt32LE(binary.length);
  tail.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([head, json, tail, binary]);
}
async function load(bytes: Buffer) {
  return new GLTFLoader()
    .register(() => ({
      name: "GeometryOnly",
      loadTexture: async () => new T.Texture(),
    }))
    .parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "",
    );
}
const bytes = await readFile(playerPath),
  { doc, binary } = unpack(bytes),
  gltf = await load(bytes);
gltf.scene.updateMatrixWorld(true);
const hand = gltf.scene.getObjectByName("hand_R")!;
const wrist = hand.getWorldPosition(new T.Vector3());
const grip = new T.Vector3();
let palmSamples = 0;
// Calibrate from the actual rebuilt glove surface, rather than trusting the
// provider's template knuckle placement to match a different neural hand.
gltf.scene.traverse((object) => {
  const mesh = object as T.SkinnedMesh;
  if (!mesh.isSkinnedMesh) return;
  mesh.skeleton.update();
  const index = mesh.skeleton.bones.findIndex((b) => b.name === "hand_R");
  const joints = mesh.geometry.getAttribute("skinIndex"),
    weights = mesh.geometry.getAttribute("skinWeight"),
    positions = mesh.geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    let influence = 0;
    for (let k = 0; k < 4; k++)
      if (joints.getComponent(i, k) === index)
        influence += weights.getComponent(i, k);
    if (influence < 0.999) continue;
    const point = mesh
      .applyBoneTransform(i, new T.Vector3().fromBufferAttribute(positions, i))
      .applyMatrix4(mesh.matrixWorld);
    if (point.distanceTo(wrist) > 0.14 || point.y > wrist.y + 0.005) continue;
    grip.add(point);
    palmSamples++;
  }
});
if (palmSamples < 20)
  throw new Error("Cannot calibrate grip against the new glove");
grip.divideScalar(palmSamples);
const localGrip = hand.worldToLocal(grip.clone());
const walk = gltf.animations.find((c) => c.name === "walk")!;
const mixer = new T.AnimationMixer(gltf.scene);
mixer.clipAction(walk).play();
mixer.setTime(walk.duration * 0.5);
gltf.scene.updateMatrixWorld(true);
const rotation = hand.getWorldQuaternion(new T.Quaternion()).invert();
const node = doc.nodes.findIndex((n: any) => n.name === "hand_R");
doc.nodes[node].children ??= [];
doc.nodes[node].children.push(doc.nodes.length);
doc.nodes.push({
  name: "torch_socket",
  translation: localGrip.toArray(),
  rotation: rotation.toArray(),
  extras: { role: "hand_grip", prop: "separate_torch_glb" },
});
for (const animation of doc.animations) {
  const record = JSON.parse(
    await readFile(
      `art-source/torchbearer-rebuild/motions/${animation.name}.json`,
      "utf8",
    ),
  );
  animation.extras = {
    source: "tencent/HY-Motion-1.0",
    source_clip: animation.name,
    source_fbx_sha256: record.sha256,
    horizontal_root_motion_removed: true,
    torch_carry_generated: true,
  };
}
for (const [alias, source] of Object.entries({
  chalk: "interact",
  refill: "interact",
  extinguish: "idle",
  fear: "idle",
  quick_turn: "idle",
})) {
  const base = structuredClone(
    doc.animations.find((a: any) => a.name === source),
  );
  base.name = alias;
  base.extras.gameplay_alias_of = source;
  doc.animations.push(base);
}
for (const material of doc.materials ?? []) material.doubleSided = true;
doc.extras = {
  ...doc.extras,
  character_rebuild: "v2",
  mesh: "new_image_to_3d_no_torch",
  rig: "fresh_anatomical_heat_bind_with_carry_IK",
  gloved_fingers: "wrist-weighted; source finger joints retained",
  animation_source: "tencent/HY-Motion-1.0",
};
const torchBytes = await readFile(torchPath),
  torch = unpack(torchBytes);
const torchGltf = await load(torchBytes);
const bounds = new T.Box3().setFromObject(torchGltf.scene);
const height = bounds.max.y - bounds.min.y;
const scene = torch.doc.scenes[torch.doc.scene ?? 0],
  children = [...scene.nodes],
  gripHeight = height * 0.29;
const wrapper = torch.doc.nodes.length;
torch.doc.nodes.push({
  name: "torch_model",
  translation: [0, -gripHeight, 0],
  children,
});
const flame = torch.doc.nodes.length;
torch.doc.nodes.push({
  name: "flame_socket",
  translation: [0, height - gripHeight + 0.02, 0],
});
const gripNode = torch.doc.nodes.length;
torch.doc.nodes.push({ name: "grip_socket", translation: [0, 0, 0] });
scene.nodes = [wrapper, flame, gripNode];
torch.doc.extras = {
  prop_rebuild: "v2",
  unlit: true,
  grip_pivot: true,
  flame: "runtime_effect_only",
  height_m: height,
};
await mkdir(destination, { recursive: true });
const player = pack(doc, binary),
  prop = pack(torch.doc, torch.binary);
await writeFile(`${destination}/torchbearer.glb`, player);
await writeFile(`${destination}/torch.glb`, prop);
await writeFile(
  `${destination}/sockets.json`,
  JSON.stringify(
    {
      player: {
        bone: "hand_R",
        socket: "torch_socket",
        translation: localGrip.toArray(),
        rotation: rotation.toArray(),
      },
      torch: { grip: "grip_socket", flame: "flame_socket", height_m: height },
      player_sha256: createHash("sha256").update(player).digest("hex"),
      torch_sha256: createHash("sha256").update(prop).digest("hex"),
    },
    null,
    2,
  ),
);
console.log(
  "Finished separate player and torch GLBs with calibrated hand and flame sockets",
);
