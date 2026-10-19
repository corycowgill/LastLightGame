import { addHunterEyes } from "./hunter-eyes";
import { prepareCharacterSurface } from "./character-materials";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x121c2a);
scene.add(new THREE.HemisphereLight(0xdce7ff, 0x39404a, 2));
const key = new THREE.DirectionalLight(0xffe3bb, 3);
key.position.set(2, 4, 3);
scene.add(key);
const rim = new THREE.DirectionalLight(0x8ab6e8, 2);
rim.position.set(-3, 2, -2);
scene.add(rim);
const camera = new THREE.PerspectiveCamera(
  40,
  innerWidth / innerHeight,
  0.01,
  100,
);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
scene.add(new THREE.GridHelper(10, 20, 0x65778e, 0x263447));
const selector = document.querySelector<HTMLSelectElement>("#asset")!;
const animations = document.querySelector<HTMLSelectElement>("#animation")!;
const status = document.querySelector("#status")!;
let root: THREE.Group | undefined, mixer: THREE.AnimationMixer | undefined;
const rigReview = new URLSearchParams(location.search).has("rigs");
const rebuildReview = new URLSearchParams(location.search).has("rebuild");
const assetBase = rigReview ? "/models/rig-review/" : "/models/catalog/";
const entries = (
  await (await fetch(assetBase + "manifest.json")).json()
).assets.filter(
  (entry: { id: string }) => !rebuildReview || entry.id === "cha_torchbearer",
);
if (rebuildReview) {
  document.querySelector("h1")!.textContent = "Rebuilt Torchbearer";
  document.querySelector("header p")!.textContent =
    "New neural body / separate hand-held torch / HF generated motion";
}
if (rigReview) {
  document.querySelector("h1")!.textContent = "Mesh2Motion rig review";
  document.querySelector("header p")!.textContent =
    "Candidate rigs · not installed in gameplay. Drag to orbit front, back and sides; pinch or scroll to zoom. Select a motion below.";
}
for (const entry of entries) selector.add(new Option(entry.name, entry.id));
let generation = 0;
function release(model: THREE.Group) {
  model.traverse((node) => {
    const mesh = node as THREE.Mesh;
    mesh.geometry?.dispose();
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh)
      (mesh as THREE.SkinnedMesh).skeleton.dispose();
    if (mesh.material)
      for (const material of Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material]) {
        for (const value of Object.values(material))
          if (value instanceof THREE.Texture) value.dispose();
        material.dispose();
      }
  });
}
async function select() {
  const version = ++generation;
  const entry = entries.find((a: { id: string }) => a.id === selector.value);
  status.textContent = "Loading " + entry.name + "…";
  const gltf = await new GLTFLoader().loadAsync(
    assetBase + entry.file + `?v=${entry.sha256 ?? "review"}`,
  );
  if (version !== generation) {
    release(gltf.scene);
    return;
  }
  if (root) {
    mixer?.stopAllAction();
    mixer?.uncacheRoot(root);
    scene.remove(root);
    release(root);
  }
  root = gltf.scene;
  if (!rigReview && entry.id.startsWith("cha_"))
    root.traverse((node) => {
      if ((node as THREE.Mesh).isMesh)
        prepareCharacterSurface(node as THREE.Mesh);
    });
  if (!rigReview && entry.id === "cha_hunter") addHunterEyes(root);
  if (entry.id === "cha_torchbearer" || rebuildReview) {
    const socket = root.getObjectByName("torch_socket");
    if (socket) {
      const torch = await new GLTFLoader().loadAsync(
        "/models/catalog/pro_torch.glb?v=separate-v2",
      );
      socket.add(torch.scene);
    }
  }
  scene.add(root);
  mixer = new THREE.AnimationMixer(root);
  animations.replaceChildren(new Option("Rest pose", ""));
  for (const clip of gltf.animations)
    animations.add(new Option(clip.name, clip.name));
  animations.onchange = () => {
    mixer!.stopAllAction();
    const clip = gltf.animations.find((c) => c.name === animations.value);
    if (clip) mixer!.clipAction(clip).play();
  };
  const bounds = new THREE.Box3().setFromObject(root),
    center = bounds.getCenter(new THREE.Vector3()),
    size = bounds.getSize(new THREE.Vector3()).length();
  controls.target.copy(center);
  camera.position
    .copy(center)
    .add(
      new THREE.Vector3(
        size * 0.75,
        size * 0.35,
        size * 1.4 * (entry.forward_axis === "-Z" ? -1 : 1),
      ),
    );
  controls.update();
  status.textContent = `${entry.name} · ${entry.triangles.toLocaleString()} triangles · ${(entry.bytes / 1024 / 1024).toFixed(2)} MB · ${entry.model} · ${entry.backend}`;
  document.body.dataset.loadedAsset = entry.id;
}
selector.onchange = () => {
  void select();
};
void select();
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  mixer?.update(Math.min(clock.getDelta(), 0.1));
  controls.update();
  renderer.render(scene, camera);
});
addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});
