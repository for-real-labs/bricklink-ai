import { it, expect } from "vitest";
import { BoxGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera } from "three";
import { idsInRectangle } from "../src/scene/selection";
it("selects projected part centers in either drag direction and skips objects behind the camera", () => {
  const camera = new PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const make = (id: string, x: number, z = 0) => {
    const mesh = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
    mesh.userData.brickId = id;
    mesh.position.set(x, 0, z);
    mesh.updateMatrixWorld();
    return mesh;
  };
  const parts = [make("center", 0), make("right", 4), make("behind", 0, 20)];
  const viewport = { left: 100, top: 100, width: 500, height: 500 };
  expect(
    idsInRectangle(
      parts,
      camera,
      viewport,
      { x: 300, y: 300 },
      { x: 400, y: 400 },
    ),
  ).toEqual(["center"]);
  expect(
    idsInRectangle(
      parts,
      camera,
      viewport,
      { x: 400, y: 400 },
      { x: 300, y: 300 },
    ),
  ).toEqual(["center"]);
  parts.forEach((part) => {
    part.geometry.dispose();
    part.material.dispose();
  });
});
