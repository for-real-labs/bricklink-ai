import { Box3, Vector3, type Camera, type Object3D } from "three";
/** Screen-space marquee selects part centers, including occluded parts, like a CAD box selection. */
export function idsInRectangle(
  objects: Object3D[],
  camera: Camera,
  viewport: { left: number; top: number; width: number; height: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
): string[] {
  return objects
    .filter((object) => {
      const center = new Box3()
        .setFromObject(object)
        .getCenter(new Vector3())
        .project(camera);
      const x = viewport.left + ((center.x + 1) * viewport.width) / 2,
        y = viewport.top + ((1 - center.y) * viewport.height) / 2;
      return (
        center.z >= -1 &&
        center.z <= 1 &&
        x >= Math.min(start.x, end.x) &&
        x <= Math.max(start.x, end.x) &&
        y >= Math.min(start.y, end.y) &&
        y <= Math.max(start.y, end.y) &&
        typeof object.userData.brickId === "string"
      );
    })
    .map((object) => object.userData.brickId as string);
}
