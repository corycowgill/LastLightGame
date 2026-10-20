import * as THREE from "three";

/** Cloth/skin should not inherit metallic authoring defaults or self-shadow acne. */
export function prepareCharacterSurface(mesh: THREE.Mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  for (const material of Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material]) {
    if (!(material instanceof THREE.MeshStandardMaterial)) continue;
    material.metalness = Math.min(material.metalness, 0.04);
    material.roughness = Math.max(material.roughness, 0.85);
  }
}

/** Ivory cloth recolor in bind coordinates, preserving the skin and leather. */
export function prepareIvoryGarb(mesh: THREE.Mesh) {
  for (const material of Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material]) {
    if (!(material instanceof THREE.MeshStandardMaterial)) continue;
    material.onBeforeCompile = (shader) => {
      shader.vertexShader =
        "varying vec3 garmentPosition;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ngarmentPosition = position;",
      );
      shader.fragmentShader =
        "varying vec3 garmentPosition;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        float height = garmentPosition.y;
        float side = abs(garmentPosition.x);
        float cloth = smoothstep(0.47, 0.54, height);
        // Keep the belt, gloves, boots, and exposed face in their original colors.
        cloth *= 1.0 - (smoothstep(0.88, 0.90, height) * (1.0 - smoothstep(0.96, 0.99, height)));
        cloth *= 1.0 - (smoothstep(0.27, 0.32, side) * (1.0 - smoothstep(0.96, 1.04, height)));
        vec3 original = diffuseColor.rgb;
        float face = smoothstep(0.04, 0.075, -garmentPosition.z)
          * (1.0 - smoothstep(0.065, 0.09, side))
          * smoothstep(1.39, 1.43, height)
          * (1.0 - smoothstep(1.58, 1.62, height));
        cloth *= 1.0 - face;
        float detail = dot(original, vec3(0.2126, 0.7152, 0.0722));
        float linenDetail = 0.60 + min(detail * 3.5, 0.40);
        float hemWear = mix(0.81, 1.0, smoothstep(0.53, 0.72, height));
        vec3 ivory = vec3(0.87, 0.85, 0.79) * linenDetail * hemWear;
        diffuseColor.rgb = mix(original, ivory, cloth);
      `,
      );
    };
    material.customProgramCacheKey = () => "torchbearer-ivory-v2";
    material.needsUpdate = true;
  }
}
