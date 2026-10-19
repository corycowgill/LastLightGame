import * as THREE from "three";

/** Head-bound, depth-tested glow; adds no gameplay light or perception. */
export function addHunterEyes(root: THREE.Object3D) {
  const head = root.getObjectByName("head");
  if (!head) return;
  let skin: THREE.SkinnedMesh | undefined;
  root.traverse((node) => {
    if ((node as THREE.SkinnedMesh).isSkinnedMesh)
      skin = node as THREE.SkinnedMesh;
  });
  const bone = skin?.skeleton.bones.indexOf(head as THREE.Bone) ?? -1;
  if (!skin || bone < 0) return;
  root.updateWorldMatrix(true, true);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d")!;
  const glow = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, "rgba(255,70,35,0.95)");
  glow.addColorStop(0.2, "rgba(255,15,5,0.65)");
  glow.addColorStop(1, "rgba(180,0,0,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, 64, 64);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const halo = new THREE.SpriteMaterial({
    map,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
    fog: false,
  });
  const core = new THREE.MeshBasicMaterial({
    color: 0xff2715,
    toneMapped: false,
    fog: false,
  });
  const geometry = new THREE.SphereGeometry(0.014, 10, 8);
  for (const side of [-1, 1]) {
    // Source mesh face positions transformed through the actual inverse bind,
    // rather than the exported skeleton's different current/rest pose.
    const position = new THREE.Vector3(side * 0.041, 1.875, 0.174)
      .applyMatrix4(skin.bindMatrix)
      .applyMatrix4(skin.skeleton.boneInverses[bone]);
    const eye = new THREE.Mesh(geometry, core);
    eye.name = "hunter_red_eye";
    eye.position.copy(position);
    head.add(eye);
    const light = new THREE.Sprite(halo);
    light.name = "hunter_eye_glow";
    light.position.copy(position);
    light.scale.set(0.1, 0.08, 1);
    head.add(light);
  }
}
