import * as THREE from "three";

/** Static broad phase; exact ray tests still decide camera collision. */
export class CameraIndex {
  private cells = new Map<string, THREE.Object3D[]>();
  private stamp = "";
  private result: THREE.Object3D[] = [];
  constructor(
    objects: THREE.Object3D[],
    private size = 8,
  ) {
    for (const object of objects) {
      const bounds = new THREE.Box3().setFromObject(object);
      for (
        let x = Math.floor(bounds.min.x / size);
        x <= Math.floor(bounds.max.x / size);
        x++
      )
        for (
          let z = Math.floor(bounds.min.z / size);
          z <= Math.floor(bounds.max.z / size);
          z++
        ) {
          const key = `${x},${z}`,
            list = this.cells.get(key) ?? [];
          list.push(object);
          this.cells.set(key, list);
        }
    }
  }
  query(a: THREE.Vector3, b: THREE.Vector3) {
    const x0 = Math.floor((Math.min(a.x, b.x) - 0.3) / this.size);
    const x1 = Math.floor((Math.max(a.x, b.x) + 0.3) / this.size);
    const z0 = Math.floor((Math.min(a.z, b.z) - 0.3) / this.size);
    const z1 = Math.floor((Math.max(a.z, b.z) + 0.3) / this.size);
    const stamp = `${x0},${x1},${z0},${z1}`;
    if (stamp === this.stamp) return this.result;
    this.stamp = stamp;
    const seen = new Set<THREE.Object3D>();
    for (let x = x0; x <= x1; x++)
      for (let z = z0; z <= z1; z++)
        for (const object of this.cells.get(`${x},${z}`) ?? [])
          seen.add(object);
    this.result = [...seen];
    return this.result;
  }
}
