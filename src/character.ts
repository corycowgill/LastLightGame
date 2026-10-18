import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export function movementClip(crouched: boolean, speed: number) {
  return crouched
    ? speed > 0.15
      ? "crouch_walk"
      : "crouch_idle"
    : speed > 4
      ? "sprint"
      : speed > 0.15
        ? "walk"
        : "idle";
}

/** One owned GLB/mixer; late loads are disposed if an expedition was replaced. */
export class AnimatedCharacter {
  root = new THREE.Group();
  ready = false;
  socket?: THREE.Object3D;
  private mixer?: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private current = "";
  private disposed = false;
  private playerMotion = false;
  private hunterMotion = false;
  get clip() {
    return this.current;
  }
  constructor(path: string, loaded: () => void) {
    this.playerMotion = path.includes("torchbearer");
    this.hunterMotion = path.includes("hunter");
    new GLTFLoader().load(
      path,
      (gltf) => {
        if (this.disposed) {
          this.release(gltf.scene);
          return;
        }
        this.root.add(gltf.scene);
        this.socket = gltf.scene.getObjectByName("torch_socket");
        gltf.scene.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = mesh.receiveShadow = true;
          }
        });
        this.mixer = new THREE.AnimationMixer(gltf.scene);
        for (const clip of gltf.animations)
          this.actions.set(clip.name, this.mixer.clipAction(clip));
        this.ready = true;
        loaded();
      },
      undefined,
      (error) => console.warn(`Character fallback retained: ${path}`, error),
    );
  }
  update(name: string, dt: number, speed?: number) {
    if (!this.mixer) return;
    const action = this.actions.get(name) ?? this.actions.get("idle");
    if (action && name !== this.current) {
      const previous = this.actions.get(this.current);
      const locomotion = ["walk", "sprint", "crouch_walk"];
      const phase =
        previous &&
        locomotion.includes(this.current) &&
        locomotion.includes(name)
          ? previous.time / previous.getClip().duration
          : 0;
      action
        .reset()
        .setEffectiveWeight(1)
        .setEffectiveTimeScale(
          this.hunterMotion
            ? name === "pursue"
              ? 1.35
              : name === "flee"
                ? 1.5
                : 1
            : name === "sprint" || name === "pursue"
              ? 3
              : name === "walk"
                ? 2
                : 1,
        );
      const once = [
        "death",
        "capture",
        "banish",
        "relight",
        "burst",
        "interact",
        "chalk",
        "refill",
        "recoil",
      ].includes(name);
      action.setLoop(
        once ? THREE.LoopOnce : THREE.LoopRepeat,
        once ? 1 : Infinity,
      );
      action.clampWhenFinished = once;
      action.play();
      action.time = phase * action.getClip().duration;
      if (previous) previous.crossFadeTo(action, 0.18, false);
      this.current = name;
    }
    if (this.playerMotion && action && speed !== undefined) {
      const reference =
        name === "sprint"
          ? 3
          : name === "crouch_walk"
            ? 0.9
            : name === "walk"
              ? 1.6
              : 0;
      action.setEffectiveTimeScale(
        reference ? THREE.MathUtils.clamp(speed / reference, 0.65, 2.2) : 1,
      );
    }
    this.mixer.update(Math.min(dt, 0.1));
  }
  private release(root: THREE.Object3D) {
    const textures = new Set<THREE.Texture>();
    root.traverse((node) => {
      const mesh = node as THREE.Mesh;
      mesh.geometry?.dispose();
      if ((mesh as THREE.SkinnedMesh).isSkinnedMesh)
        (mesh as THREE.SkinnedMesh).skeleton.dispose();
      if (mesh.material)
        for (const material of Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]) {
          Object.values(material).forEach((value) => {
            if (value instanceof THREE.Texture) textures.add(value);
          });
          material.dispose();
        }
    });
    textures.forEach((texture) => {
      texture.dispose();
    });
  }
  dispose() {
    this.disposed = true;
    this.mixer?.stopAllAction();
    this.mixer?.uncacheRoot(this.root.children[0] ?? this.root);
    this.actions.clear();
    this.release(this.root);
    this.root.removeFromParent();
  }
}
