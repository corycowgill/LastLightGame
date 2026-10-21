import * as THREE from "three";
/** Presentation only. Original rig, geometry, navigation and perception remain intact. */
export class HunterShroud {
  private uniforms = { time: { value: 0 }, opacity: { value: 0.42 } };
  private wisps: THREE.Points;
  private prepared = false;
  constructor(private root: THREE.Group) {
    const geometry = new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(28 * 3), 3),
    );
    this.wisps = new THREE.Points(
      geometry,
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        vertexShader: `varying float life;uniform float time;void main(){vec4 p=modelViewMatrix*vec4(position,1.);life=position.y/2.4;gl_Position=projectionMatrix*p;gl_PointSize=clamp((85.+35.*sin(position.y*4.+time))/max(1.,-p.z),2.,100.);}`,
        fragmentShader: `varying float life;uniform float opacity;void main(){float d=length(gl_PointCoord-.5);float a=(1.-smoothstep(.05,.5,d))*(1.-life*.7)*opacity;gl_FragColor=vec4(.018,.025,.042,a);}`,
      }),
    );
    this.wisps.frustumCulled = false;
    root.add(this.wisps);
  }
  prepare(actor: THREE.Object3D) {
    if (this.prepared) return;
    this.prepared = true;
    actor.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh || !(mesh as THREE.SkinnedMesh).isSkinnedMesh) return;
      const surfaces = (
        Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      ).map((source) => {
        if (!(source instanceof THREE.MeshStandardMaterial)) return source;
        const material = source;
        material.metalness = 0;
        material.roughness = 0.96;
        material.onBeforeCompile = (shader) => {
          shader.uniforms.shadowTime = this.uniforms.time;
          shader.vertexShader =
            "varying vec3 shadowBindPosition;\n" +
            shader.vertexShader.replace(
              "#include <begin_vertex>",
              "#include <begin_vertex>\nshadowBindPosition=position;",
            );
          shader.fragmentShader =
            "varying vec3 shadowBindPosition;uniform float shadowTime;\n" +
            shader.fragmentShader.replace(
              "#include <map_fragment>",
              `#include <map_fragment>
      float grain=.5+.5*sin(shadowBindPosition.y*19.-shadowTime*.75+sin(shadowBindPosition.x*27.+shadowTime*.3));
      diffuseColor.rgb=mix(diffuseColor.rgb*.22,diffuseColor.rgb*vec3(.36,.43,.55),grain*.65);
      `,
            );
        };
        material.customProgramCacheKey = () => "hunter-shadow-surface-v1";
        return material;
      });
      mesh.material = Array.isArray(mesh.material) ? surfaces : surfaces[0];
    });
  }
  update(time: number, state: string) {
    this.uniforms.time.value = time;
    this.uniforms.opacity.value = state === "FLEEING" ? 0.2 : 0.42;
    const positions = this.wisps.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const rise = (time * 0.22 + i * 0.618) % 1;
      const angle = i * 2.399 + time * 0.23;
      const radius = 0.26 + rise * 0.32;
      positions.setXYZ(
        i,
        Math.cos(angle) * radius,
        0.06 + rise * 2.1,
        Math.sin(angle) * radius,
      );
    }
    positions.needsUpdate = true;
  }
}
