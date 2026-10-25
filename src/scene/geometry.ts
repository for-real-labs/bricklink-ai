import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { PART_MAP } from "../domain/catalog";
import { footprint, type Brick } from "../domain/model";
export const PLATE_HEIGHT = 0.4;
export function buildBrick(
  brick: Brick,
  selected = false,
  ghost = false,
  valid = true,
) {
  const part = PART_MAP.get(brick.partId)!;
  const group = new THREE.Group();
  const h = part.height * PLATE_HEIGHT;
  const material = new THREE.MeshStandardMaterial({
    color: ghost && !valid ? "#ed4e4e" : brick.color,
    roughness: 0.32,
    metalness: 0,
    transparent: ghost,
    opacity: ghost ? 0.58 : 1,
  });
  let body: THREE.BufferGeometry;
  if (part.kind === "round")
    body = new THREE.CylinderGeometry(
      part.width / 2 - 0.025,
      part.width / 2 - 0.025,
      h - 0.025,
      32,
    );
  else if (part.kind === "slope") {
    const shape = new THREE.Shape();
    shape.moveTo(-part.depth / 2, -h / 2);
    shape.lineTo(part.depth / 2, -h / 2);
    shape.lineTo(part.depth / 2, -h / 2 + 0.15);
    shape.lineTo(-part.depth / 2 + 0.7, h / 2);
    shape.lineTo(-part.depth / 2, h / 2);
    shape.closePath();
    body = new THREE.ExtrudeGeometry(shape, {
      depth: part.width - 0.035,
      bevelEnabled: false,
    });
    body.rotateY(-Math.PI / 2);
    body.translate((part.width - 0.035) / 2, 0, 0);
  } else
    body = new RoundedBoxGeometry(
      part.width - 0.035,
      h - 0.025,
      part.depth - 0.035,
      2,
      0.035,
    );
  const mesh = new THREE.Mesh(body, material);
  mesh.position.y = h / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  if (part.kind !== "tile") {
    const positions: [number, number][] = [];
    if (part.kind === "round" && part.width === 1) positions.push([0, 0]);
    else
      for (let x = 0; x < part.width; x++)
        for (let z = 0; z < (part.kind === "slope" ? 1 : part.depth); z++)
          positions.push([x - (part.width - 1) / 2, z - (part.depth - 1) / 2]);
    const studs = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.295, 0.3, 0.18, 20),
      material,
      positions.length,
    );
    positions.forEach(([x, z], index) =>
      studs.setMatrixAt(
        index,
        new THREE.Matrix4().makeTranslation(x, h + 0.075, z),
      ),
    );
    studs.castShadow = true;
    studs.receiveShadow = true;
    group.add(studs);
  }
  if (selected) {
    const line = new THREE.LineSegments(
      new THREE.EdgesGeometry(
        new THREE.BoxGeometry(part.width + 0.06, h + 0.1, part.depth + 0.06),
      ),
      new THREE.LineBasicMaterial({ color: "#ff4b4b", depthTest: false }),
    );
    line.position.y = h / 2;
    line.renderOrder = 4;
    group.add(line);
  }
  const f = footprint(brick);
  group.position.set(
    brick.x + f.width / 2,
    brick.y * PLATE_HEIGHT,
    brick.z + f.depth / 2,
  );
  group.rotation.y = (brick.rotation * Math.PI) / 2;
  group.userData.brickId = brick.id;
  return group;
}
export function disposeObject(object: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
      child.geometry.dispose();
      (Array.isArray(child.material)
        ? child.material
        : [child.material]
      ).forEach((m) => materials.add(m));
    }
  });
  materials.forEach((m) => m.dispose());
}
