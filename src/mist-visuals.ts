import * as THREE from "three";
import type { LivingMist } from "./living-mist";
/** One bounded instanced cloud draw, no light/shadow passes or per-frame meshes. */
export class MistVisuals {
  private mesh: THREE.InstancedMesh;
  private weights = new THREE.InstancedBufferAttribute(new Float32Array(96), 1);
  private pose = new THREE.Matrix4();
  private selected: LivingMist["cells"] = [];
  private nextSelection = 0;
  constructor(scene: THREE.Scene) {
    const data = new Uint8Array(32 * 32 * 4);
    let seed = 9137;
    for (let i = 0; i < 32 * 32; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const v = seed >>> 24;
      data.set([v, v, v, 255], i * 4);
    }
    const noiseMap = new THREE.DataTexture(data, 32, 32);
    noiseMap.wrapS = noiseMap.wrapT = THREE.RepeatWrapping;
    noiseMap.magFilter = noiseMap.minFilter = THREE.LinearFilter;
    noiseMap.needsUpdate = true;
    const geometry = new THREE.PlaneGeometry(3.8, 1.7);
    geometry.setAttribute("density", this.weights);
    const material = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, noiseMap: { value: noiseMap } },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      vertexShader: `attribute float density;varying vec2 cloudUv;varying float cloudDensity;varying float cameraDistance;varying vec2 cloudSeed;uniform float time;
   void main(){cloudUv=uv;cloudDensity=density;vec4 world=instanceMatrix*vec4(0.,0.,0.,1.);cloudSeed=world.xz*.173;vec4 center=modelViewMatrix*world;cameraDistance=length(center.xyz);float size=.85+.3*fract(sin(dot(world.xz,vec2(12.98,78.23)))*43758.5);center.xy+=position.xy*size;gl_Position=projectionMatrix*center;}`,
      fragmentShader: `varying vec2 cloudUv;varying float cloudDensity;varying float cameraDistance;varying vec2 cloudSeed;uniform float time;uniform sampler2D noiseMap;
   float noise(vec2 p){return texture2D(noiseMap,p*.045).r;}
   void main(){vec2 p=cloudUv*2.-1.;vec2 drift=vec2(time*.055,-time*.025);vec2 warp=p*3.+cloudSeed+drift;float low=noise(warp);float detail=.58*low+.28*noise(warp*2.1+low)+.14*noise(warp*4.2);float edge=1.-smoothstep(.25,1.,dot(p,p));float a=edge*smoothstep(.15,.82,detail)*cloudDensity*.52*smoothstep(.5,1.5,cameraDistance)*(1.-smoothstep(15.,22.,cameraDistance));vec3 tint=mix(vec3(.095,.13,.17),vec3(.26,.30,.32),detail*.8+cloudUv.y*.2);gl_FragColor=vec4(tint,a);}`,
    });
    (material as THREE.ShaderMaterial & { map: THREE.Texture }).map = noiseMap;
    this.mesh = new THREE.InstancedMesh(geometry, material, 96);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    scene.add(this.mesh);
  }
  update(mist: LivingMist, player: { x: number; z: number }, elapsed: number) {
    if (elapsed >= this.nextSelection || !this.selected.length) {
      this.selected = mist.cells
        .filter((c) => c.density >= 0.02 && Math.hypot(c.x - player.x, c.z - player.z) < 14)
        .sort(
          (a, b) =>
            Math.hypot(a.x - player.x, a.z - player.z) -
            Math.hypot(b.x - player.x, b.z - player.z),
        )
        .slice(0, 96);
      this.nextSelection = elapsed + 0.25;
    }
    let n = 0;
    for (const c of this.selected) {
      if (c.density < 0.02 || Math.hypot(c.x - player.x, c.z - player.z) > 18)
        continue;
      this.pose.makeTranslation(
        c.x + Math.sin(elapsed * 0.19 + c.z) * 0.2,
        0.5 + (Math.sin(c.x * 1.7 + c.z * 2.3) * 0.5 + 0.5) * 0.6,
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
