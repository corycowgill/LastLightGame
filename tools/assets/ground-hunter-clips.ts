// Run after extend_hunter_motions.py. Fit original motion to the shipped skin.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const path = "public/models/hunter.glb";
const bytes = readFileSync(path);
const jsonLength = bytes.readUInt32LE(12);
const doc = JSON.parse(bytes.toString("utf8", 20, 20 + jsonLength));
const binary = Buffer.from(bytes.subarray(28 + jsonLength));
const gltf = await new GLTFLoader().register(() => ({
  name: "HeadlessTexture", loadTexture: async () => new THREE.Texture(),
})).parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
for (const name of ["crawl", "listen"]) {
  const animation = doc.animations.find((a: any) => a.name === name);
  if (animation.extras.skin_grounded) continue;
  const channel = animation.channels.find((c: any) => c.target.path === "translation");
  const sampler = animation.samplers[channel.sampler];
  const input = doc.accessors[sampler.input], output = doc.accessors[sampler.output];
  const inputOffset = doc.bufferViews[input.bufferView].byteOffset + (input.byteOffset || 0);
  const outputOffset = doc.bufferViews[output.bufferView].byteOffset + (output.byteOffset || 0);
  const mixer = new THREE.AnimationMixer(gltf.scene);
  mixer.clipAction(gltf.animations.find((c) => c.name === name)!).play();
  const corrections: number[] = [];
  for (let i = 0; i < input.count; i++) {
    mixer.setTime(binary.readFloatLE(inputOffset + i * 4));
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((n) => {
      const mesh = n as THREE.SkinnedMesh;
      if (mesh.isSkinnedMesh) mesh.skeleton.update();
    });
    corrections.push(new THREE.Box3().setFromObject(gltf.scene, true).min.y - 0.015);
  }
  for (let i = 0; i < output.count; i++) {
    const offset = outputOffset + i * 12 + 8;
    binary.writeFloatLE(binary.readFloatLE(offset) - corrections[i], offset);
  }
  animation.extras.skin_grounded = true;
  mixer.stopAllAction(); mixer.uncacheRoot(gltf.scene);
}
let json = Buffer.from(JSON.stringify(doc));
json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
const header = Buffer.alloc(20);
header.write("glTF"); header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + json.length + binary.length, 8);
header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
const binaryHeader = Buffer.alloc(8);
binaryHeader.writeUInt32LE(binary.length); binaryHeader.writeUInt32LE(0x004e4942, 4);
const result = Buffer.concat([header, json, binaryHeader, binary]);
writeFileSync(path, result);
writeFileSync("public/models/catalog/cha_hunter.glb", result);
const manifestPath = "public/models/catalog/manifest.json";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const entry = manifest.assets.find((a: any) => a.id === "cha_hunter");
entry.sha256 = createHash("sha256").update(result).digest("hex");
entry.bytes = result.length;
entry.animation_source.skin_grounded = true;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
