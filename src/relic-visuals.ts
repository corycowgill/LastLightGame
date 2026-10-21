import { glyphSvg, type Glyph } from "./visual-language";
import * as THREE from "three";

/** Readable relic signal. Depth-tested motes reveal a discovery, never a wallhack. */
export function relicMotes(sealed: boolean, color = "#f5cc77") {
  const geometry = new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(24 * 3), 3),
  );
  const material = new THREE.ShaderMaterial({
    uniforms: {
      intensity: { value: 0.75 },
      tint: { value: new THREE.Color(color) },
    },
    vertexShader: `void main(){ vec4 p=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*p; gl_PointSize=clamp(38.0/max(1.0,-p.z),1.0,7.0); }`,
    fragmentShader: `uniform float intensity; uniform vec3 tint; void main(){ float d=length(gl_PointCoord-vec2(0.5)); float a=(1.0-smoothstep(0.05,0.5,d))*intensity; gl_FragColor=vec4(tint,a); }`,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.name = "relic-soul-motes";
  // Explicit bounds avoid recomputing a bound for every animation update.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.8, 0), 1.6);
  points.userData.sealed = sealed;
  points.castShadow = false;
  return points;
}

export function animateRelicMotes(
  points: THREE.Points,
  time: number,
  opening = 0,
) {
  const positions = points.geometry.getAttribute(
    "position",
  ) as THREE.BufferAttribute;
  for (let i = 0; i < positions.count; i++) {
    const rise = (time * 0.19 + i * 0.61803399) % 1;
    const angle = i * 2.39996 + time * 0.32;
    const radius = (points.userData.sealed ? 0.44 : 0.32) * (0.7 + rise * 0.3);
    positions.setXYZ(
      i,
      Math.cos(angle) * radius,
      0.2 + rise * 1.35,
      Math.sin(angle) * radius,
    );
  }
  positions.needsUpdate = true;
  (points.material as THREE.ShaderMaterial).uniforms.intensity.value =
    0.65 + 0.15 * Math.sin(time * 2.2) + Math.min(0.4, opening * 0.12);
}

/** Clone only relic materials; catalog templates remain shared and unchanged. */
export function illuminateRelic(root: THREE.Object3D, color = "#f5cc77") {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = (
      Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    ).map((source) => {
      const material = source.clone() as THREE.MeshStandardMaterial;
      if (material.isMeshStandardMaterial) {
        material.emissive.set(color);
        material.emissiveIntensity = 0.48;
        material.roughness = Math.min(material.roughness, 0.55);
      }
      return material;
    });
    mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
    mesh.castShadow = false;
  });
}

/** A depth-tested emblem over the existing GLB, never an omniscient marker. */
export function relicEmblem(glyph: Glyph, color: string) {
  const svg = glyphSvg(glyph, "#ffffff").replace(
    "<svg ",
    '<svg xmlns="http://www.w3.org/2000/svg" ',
  );
  const texture = new THREE.TextureLoader().load(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      color,
      transparent: true,
      opacity: 0.85,
      depthTest: true,
      depthWrite: false,
    }),
  );
  sprite.position.y = 1.1;
  sprite.scale.set(0.48, 0.48, 1);
  return sprite;
}
