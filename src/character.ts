import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  prepareCharacterSurface,
  prepareIvoryGarb,
} from "./character-materials";

export function movementClip(crouched: boolean, speed: number, previous = "") {
  // Separate enter/exit thresholds prevent gait flicker during acceleration.
  const moving =
    speed > (["walk", "sprint", "crouch_walk"].includes(previous) ? 0.08 : 0.2);
  const sprinting = speed > (previous === "sprint" ? 3.7 : 4.3);
  return crouched
    ? moving
      ? "crouch_walk"
      : "crouch_idle"
    : sprinting
      ? "sprint"
      : moving
        ? "walk"
        : "idle";
}

export function smoothFacing(current: number, target: number, dt: number) {
  const delta = Math.atan2(
    Math.sin(target - current),
    Math.cos(target - current),
  );
  return current + delta * (1 - Math.exp(-14 * Math.max(0, Math.min(dt, 0.1))));
}

/**
 * Ground speed (m/s) each in-place locomotion clip implies at timeScale 1,
 * measured from horizontal foot travel over the lowest 40% of each step in the shipped GLBs (see
 * character.test.ts). `max` caps cadence so short authored strides speed up
 * believably instead of frantically; any remaining gap is accepted slide.
 */
export const LOCOMOTION: Record<
  "torchbearer" | "hunter" | "stalker",
  Record<string, { natural: number; min: number; max: number }>
> = {
  torchbearer: {
    walk: { natural: 1.0, min: 0.65, max: 2.7 },
    sprint: { natural: 1.25, min: 0.8, max: 2.3 },
    crouch_walk: { natural: 0.85, min: 0.6, max: 2.4 },
  },
  hunter: {
    search: { natural: 1.0, min: 0.6, max: 2.4 },
    pursue: { natural: 4.0, min: 0.4, max: 1.6 },
    flee: { natural: 5.7, min: 0.6, max: 1.5 },
    crawl: { natural: 1.0, min: 0.6, max: 2.2 },
  },
  stalker: {
    investigate: { natural: 0.38, min: 0.6, max: 3 },
    investigate_fast: { natural: 0.74, min: 0.6, max: 3 },
    crawl: { natural: 0.38, min: 0.6, max: 3 },
  },
};
/** Playback rate that keeps planted feet under a body moving at `speed`. */
export function locomotionTimeScale(
  model: keyof typeof LOCOMOTION,
  clip: string,
  speed: number,
) {
  const gait = LOCOMOTION[model][clip];
  return gait
    ? THREE.MathUtils.clamp(speed / gait.natural, gait.min, gait.max)
    : undefined;
}

const PLAYER_GESTURE_SECONDS: Record<string, number> = {
  death: 2.1,
  relight: 2,
  burst: 0.7,
  interact: 0.85,
  chalk: 0.85,
  refill: 0.85,
};

/** Ankle height every grounded clip in the shipped rigs already rests at. */
const ANKLE_HEIGHT = 0.035;
/**
 * Lift needed per clip so its lowest foot/toe joint rests at ankle height.
 * Only raises sunken clips; poses that leave the floor (death falls) keep
 * their authored motion.
 */
export function measureGroundLift(
  root: THREE.Object3D,
  clips: THREE.AnimationClip[],
  samples = 24,
) {
  const feet: THREE.Object3D[] = [];
  root.traverse((node) => {
    if ((node as THREE.Bone).isBone && /^(foot|ball)/i.test(node.name))
      feet.push(node);
  });
  const lifts = new Map<string, number>();
  if (!feet.length) return lifts;
  const mixer = new THREE.AnimationMixer(root);
  const point = new THREE.Vector3();
  for (const clip of clips) {
    const action = mixer.clipAction(clip).play();
    let lowest = Infinity;
    for (let i = 0; i < samples; i++) {
      mixer.setTime((clip.duration * i) / samples);
      root.updateMatrixWorld(true);
      const base = root.getWorldPosition(new THREE.Vector3()).y;
      for (const foot of feet)
        lowest = Math.min(lowest, foot.getWorldPosition(point).y - base);
    }
    action.stop();
    lifts.set(clip.name, Math.max(0, ANKLE_HEIGHT - lowest));
  }
  mixer.stopAllAction();
  mixer.uncacheRoot(root);
  return lifts;
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
  private stalkerMotion = false;
  private fearPose = 0;
  private poseBones: {
    bone: THREE.Object3D;
    rotation: THREE.Quaternion;
    position: THREE.Vector3;
  }[] = [];
  /** Per-clip lift that returns sunken feet to the floor (metres). */
  private groundLift = new Map<THREE.AnimationAction, number>();
  private model?: THREE.Object3D;
  private finishLoading!: () => void;
  readonly settled = new Promise<void>((resolve) => {
    this.finishLoading = resolve;
  });
  get clip() {
    return this.current;
  }
  constructor(path: string, loaded: () => void) {
    this.playerMotion = path.includes("torchbearer");
    this.hunterMotion = path.includes("hunter");
    this.stalkerMotion = path.includes("stalker");
    new GLTFLoader().load(
      path,
      (gltf) => {
        if (this.disposed) {
          this.release(gltf.scene);
          this.finishLoading();
          return;
        }
        this.root.add(gltf.scene);
        this.socket = gltf.scene.getObjectByName("torch_socket");
        gltf.scene.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (mesh.isMesh) {
            prepareCharacterSurface(mesh);
            if (this.playerMotion) prepareIvoryGarb(mesh);
          }
        });
        this.model = gltf.scene;
        const lifts = measureGroundLift(gltf.scene, gltf.animations);
        this.mixer = new THREE.AnimationMixer(gltf.scene);
        for (const clip of gltf.animations) {
          const action = this.mixer.clipAction(clip);
          this.actions.set(clip.name, action);
          this.groundLift.set(action, lifts.get(clip.name) ?? 0);
        }
        if (this.stalkerMotion) {
          for (const [name, source] of [
            ["cower", "recoil"],
            ["crawl", "investigate"],
          ]) {
            const clip = gltf.animations
              .find((c) => c.name === source)
              ?.clone();
            if (clip) {
              clip.name = name;
              const action = this.mixer.clipAction(clip);
              this.actions.set(name, action);
              this.groundLift.set(action, lifts.get(source) ?? 0);
            }
          }
          for (const name of [
            "hips",
            "spine",
            "chest",
            "head",
            "upperarm_L",
            "upperarm_R",
            "thigh_L",
            "thigh_R",
            "shin_L",
            "shin_R",
            "foot_L",
            "foot_R",
          ]) {
            const bone = gltf.scene.getObjectByName(name);
            if (bone)
              this.poseBones.push({
                bone,
                rotation: bone.quaternion.clone(),
                position: bone.position.clone(),
              });
          }
        }
        this.ready = true;
        loaded();
        this.finishLoading();
      },
      undefined,
      (error) => {
        console.warn(`Character fallback retained: ${path}`, error);
        this.finishLoading();
      },
    );
  }
  update(name: string, dt: number, speed?: number, gestureDuration?: number) {
    if (!this.mixer) return;
    const action = this.actions.get(name) ?? this.actions.get("idle");
    if (action && name !== this.current) {
      const previous = this.actions.get(this.current);
      const locomotion = ["walk", "sprint", "crouch_walk"];
      const phase =
        previous &&
        locomotion.includes(this.current) &&
        locomotion.includes(name)
          ? (previous.time / previous.getClip().duration) % 1
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
        "cower",
        "extinguish",
        "fear",
        "quick_turn",
      ].includes(name);
      action.setLoop(
        once ? THREE.LoopOnce : THREE.LoopRepeat,
        once ? 1 : Infinity,
      );
      action.clampWhenFinished = once;
      action.play();
      action.time = phase * action.getClip().duration;
      // Cancel stale fades when a transition is interrupted (walk→sprint→crouch).
      // Otherwise an older action can regain weight and pull limbs toward its pose.
      for (const other of this.actions.values()) {
        if (other === action) continue;
        if (other.isRunning()) {
          const weight = other.getEffectiveWeight();
          other.stopFading().setEffectiveWeight(weight).fadeOut(0.18);
        }
      }
      if (previous) action.fadeIn(0.18);
      this.current = name;
    }
    const model = this.playerMotion
      ? "torchbearer"
      : this.hunterMotion
        ? "hunter"
        : "stalker";
    const gait =
      action && speed !== undefined
        ? locomotionTimeScale(model, name, speed)
        : undefined;
    if (action && gait !== undefined) action.setEffectiveTimeScale(gait);
    else if (this.playerMotion && action && speed !== undefined)
      action.setEffectiveTimeScale(
        action.getClip().duration /
          (gestureDuration ??
            PLAYER_GESTURE_SECONDS[name] ??
            action.getClip().duration),
      );
    if (this.stalkerMotion)
      for (const p of this.poseBones) {
        p.bone.quaternion.copy(p.rotation);
        p.bone.position.copy(p.position);
      }
    this.mixer.update(Math.min(dt, 0.1));
    if (this.model) {
      // Blend each running clip's grounding by its weight so fades never pop.
      let lift = 0,
        total = 0;
      for (const [entry, value] of this.groundLift) {
        const weight = entry.isRunning() ? entry.getEffectiveWeight() : 0;
        lift += weight * value;
        total += weight;
      }
      this.model.position.y = total > 0 ? lift / total : 0;
    }
    if (this.stalkerMotion) {
      this.fearPose = THREE.MathUtils.damp(
        this.fearPose,
        name === "cower" || name === "crawl" ? 1 : 0,
        8,
        dt,
      );
      for (const p of this.poseBones) {
        p.rotation.copy(p.bone.quaternion);
        p.position.copy(p.bone.position);
        const pitch =
          p.bone.name === "spine"
            ? 0.65
            : p.bone.name === "chest"
              ? 0.25
              : p.bone.name === "head"
                ? -0.15
                : p.bone.name.startsWith("thigh")
                  ? 0.55
                  : p.bone.name.startsWith("shin")
                    ? -0.9
                    : p.bone.name.startsWith("foot")
                      ? 0.35
                      : 0;
        p.bone.rotateX(pitch * this.fearPose);
        if (p.bone.name === "hips") p.bone.position.y -= 0.2 * this.fearPose;
      }
    }
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
