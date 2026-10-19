import * as THREE from "three";

/** Attach a separate rigid GLB to the animated grip, including its orientation. */
export class TorchAttachment {
  private point = new THREE.Vector3();
  private rotation = new THREE.Quaternion();
  private inverseParent = new THREE.Quaternion();
  update(
    parent: THREE.Object3D,
    socket: THREE.Object3D,
    prop: THREE.Object3D,
    flame: THREE.Object3D,
  ) {
    socket.getWorldPosition(this.point);
    parent.worldToLocal(this.point);
    socket.getWorldQuaternion(this.rotation);
    parent.getWorldQuaternion(this.inverseParent).invert();
    prop.position.copy(this.point);
    prop.quaternion.copy(this.inverseParent).multiply(this.rotation);
    prop.updateMatrixWorld(true);
    const tip = prop.getObjectByName("flame_socket");
    if (tip) {
      tip.getWorldPosition(this.point);
      parent.worldToLocal(this.point);
      flame.position.copy(this.point);
    }
  }
}
