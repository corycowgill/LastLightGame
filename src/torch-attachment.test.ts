import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { TorchAttachment } from "./torch-attachment";
async function load(path: string) {
  const bytes = await readFile(new URL(path, import.meta.url));
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
test("separate neural torch stays gripped and upright throughout torch-carry gaits", async () => {
  const actor = await load("../public/models/torchbearer.glb");
  const torch = await load("../public/models/catalog/pro_torch.glb");
  const parent = new T.Group(),
    hardware = new T.Group(),
    flame = new T.Object3D();
  parent.position.set(14, 0, -7);
  parent.rotation.y = 1.7;
  parent.add(actor.scene, hardware, flame);
  hardware.add(torch.scene);
  const socket = actor.scene.getObjectByName("torch_socket")!;
  assert.equal(socket.parent!.name, "hand_R");
  assert.ok(torch.scene.getObjectByName("grip_socket"));
  const tip = torch.scene.getObjectByName("flame_socket")!;
  assert.ok(tip);
  let glove!: T.SkinnedMesh;
  actor.scene.traverse((node) => {
    if ((node as T.SkinnedMesh).isSkinnedMesh) glove = node as T.SkinnedMesh;
  });
  const positions = glove.geometry.getAttribute("position"),
    joints = glove.geometry.getAttribute("skinIndex"),
    weights = glove.geometry.getAttribute("skinWeight");
  const handIndex = glove.skeleton.bones.findIndex((b) => b.name === "hand_R");
  const palmVertices: number[] = [];
  for (let i = 0; i < positions.count; i++)
    for (let k = 0; k < 4; k++)
      if (
        joints.getComponent(i, k) === handIndex &&
        weights.getComponent(i, k) > 0.999
      )
        palmVertices.push(i);
  assert.ok(palmVertices.length > 100);
  const grip = new TorchAttachment();
  for (const name of [
    "idle",
    "walk",
    "sprint",
    "crouch_idle",
    "crouch_walk",
    "interact",
    "relight",
    "burst",
  ]) {
    const clip = actor.animations.find((c) => c.name === name)!;
    const mixer = new T.AnimationMixer(actor.scene);
    mixer.clipAction(clip).play();
    for (let frame = 0; frame < 24; frame++) {
      mixer.setTime((clip.duration * frame) / 24);
      parent.updateMatrixWorld(true);
      grip.update(parent, socket, hardware, flame);
      parent.updateMatrixWorld(true);
      assert.ok(
        hardware
          .getWorldPosition(new T.Vector3())
          .distanceTo(socket.getWorldPosition(new T.Vector3())) < 1e-5,
        `${name}: grip drift`,
      );
      assert.ok(
        flame
          .getWorldPosition(new T.Vector3())
          .distanceTo(tip.getWorldPosition(new T.Vector3())) < 1e-5,
        `${name}: flame drift`,
      );
      glove.skeleton.update();
      const contact = hardware.getWorldPosition(new T.Vector3());
      const distance = Math.min(
        ...palmVertices.map((i) =>
          glove
            .applyBoneTransform(
              i,
              new T.Vector3().fromBufferAttribute(positions, i),
            )
            .applyMatrix4(glove.matrixWorld)
            .distanceTo(contact),
        ),
      );
      assert.ok(
        distance < 0.035,
        `${name}: torch grip missed the actual glove by ${distance}m`,
      );
      const direction = new T.Vector3(0, 1, 0).applyQuaternion(
        hardware.getWorldQuaternion(new T.Quaternion()),
      );
      assert.ok(direction.y > 0.97, `${name}: torch tipped toward head`);
      const hand = socket.getWorldPosition(new T.Vector3()),
        head = actor.scene
          .getObjectByName("head")!
          .getWorldPosition(new T.Vector3());
      assert.ok(
        tip.getWorldPosition(new T.Vector3()).distanceTo(head) > 0.23,
        `${name}: flame inside hood`,
      );
      assert.ok(hand.distanceTo(tip.getWorldPosition(new T.Vector3())) > 0.45);
    }
    mixer.stopAllAction();
    mixer.uncacheRoot(actor.scene);
  }
});
