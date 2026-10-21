import * as THREE from "three";
import type { LivingMist } from "./living-mist";
/** One bounded instanced cloud draw, no light/shadow passes or per-frame meshes. */
export class MistVisuals {
  private mesh: THREE.InstancedMesh;
  private weights = new THREE.InstancedBufferAttribute(
    new Float32Array(160),
    1,
  );
  private pose = new THREE.Matrix4();
  constructor(scene: THREE.Scene) {
    const geometry = new THREE.PlaneGeometry(3.8, 1.7);
    geometry.setAttribute("density", this.weights);
    const material = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      vertexShader: `attribute float density;varying vec2 cloudUv;varying float cloudDensity;varying float cameraDistance;uniform float time;
   void main(){cloudUv=uv;cloudDensity=density;vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);cameraDistance=length(center.xyz);center.xy+=position.xy;gl_Position=projectionMatrix*center;}`,
      fragmentShader: `varying vec2 cloudUv;varying float cloudDensity;varying float cameraDistance;uniform float time;
   void main(){vec2 p=cloudUv*2.-1.;float edge=1.-smoothstep(.25,1.,dot(p,p));float noise=.64+.16*sin(p.x*8.+time*.7+sin(p.y*7.-time*.3))+.12*sin(p.y*13.+p.x*5.-time*.4);float a=edge*noise*cloudDensity*.43*smoothstep(.5,1.5,cameraDistance)*(1.-smoothstep(15.,22.,cameraDistance));vec3 tint=mix(vec3(.14,.19,.23),vec3(.29,.34,.36),cloudUv.y);gl_FragColor=vec4(tint,a);}`,
    });
    this.mesh = new THREE.InstancedMesh(geometry, material, 160);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    scene.add(this.mesh);
  }
  update(mist: LivingMist, player: { x: number; z: number }, elapsed: number) {
    let n = 0;
    for (const c of mist.cells) {
      if (n >= 160) break;
      if (c.density < 0.02 || Math.hypot(c.x - player.x, c.z - player.z) > 18)
        continue;
      this.pose.makeTranslation(
        c.x + Math.sin(elapsed * 0.19 + c.z) * 0.2,
        0.55 + Math.sin(c.x + c.z) * 0.12,
        c.z + Math.cos(elapsed * 0.16 + c.x) * 0.2,
      );
      this.mesh.setMatrixAt(n, this.pose);
      this.weights.setX(n, c.density);
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.weights.needsUpdate = true;
    (this.mesh.material as THREE.ShaderMaterial).uniforms.time.value = elapsed;
  }
}
