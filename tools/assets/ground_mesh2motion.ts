/** Ground the site's fitted death clip; retain its original rotations and skin. */
import { readFile, writeFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const path = process.argv[2];
const bytes = await readFile(path);
const length = bytes.readUInt32LE(12);
const doc = JSON.parse(bytes.toString("utf8", 20, 20 + length));
const loader = new GLTFLoader().register(() => ({
  name: "GeometryOnly",
  loadTexture: async () => new THREE.Texture(),
}));
const gltf = await loader.parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
const animation = doc.animations.find((a: any) => a.name === "death");
const channel = animation.channels.find(
  (c: any) => c.target.path === "translation",
);
const sampler = animation.samplers[channel.sampler];
const binary = 28 + length;
function offset(index: number) {
  const a = doc.accessors[index];
  return (
    binary +
    (doc.bufferViews[a.bufferView].byteOffset ?? 0) +
    (a.byteOffset ?? 0)
  );
}
const input = offset(sampler.input),
  output = offset(sampler.output);
const mixer = new THREE.AnimationMixer(gltf.scene);
mixer
  .clipAction(gltf.animations.find((a) => a.name === "death")!)
  .setLoop(THREE.LoopOnce, 1)
  .play().clampWhenFinished = true;
for (let i = 0; i < doc.accessors[sampler.input].count; i++) {
  mixer.setTime(bytes.readFloatLE(input + i * 4));
  gltf.scene.updateMatrixWorld(true);
  const floor = new THREE.Box3().setFromObject(gltf.scene, true).min.y;
  // Pelvis Z is vertical underneath the exported root's -90-degree X rotation.
  bytes.writeFloatLE(
    bytes.readFloatLE(output + i * 12 + 8) - floor,
    output + i * 12 + 8,
  );
}
await writeFile(path, bytes);
console.log("Grounded site death clip:", path);
