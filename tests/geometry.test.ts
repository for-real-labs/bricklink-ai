import { describe, expect, it } from "vitest";
import { Box3 } from "three";
import { PARTS } from "../src/domain/catalog";
import { createBrick, footprint } from "../src/domain/model";
import { buildBrick, disposeObject, PLATE_HEIGHT } from "../src/scene/geometry";
describe("procedural geometry", () => {
  it.each(PARTS.map((part) => [part.id, part.name]))(
    "matches catalog bounds for %s (%s)",
    (partId) => {
      for (let rotation = 0; rotation < 4; rotation++) {
        const brick = {
          ...createBrick(partId, "#c85c42"),
          x: 5,
          y: 3,
          z: -5,
          rotation,
        };
        const mesh = buildBrick(brick),
          bounds = new Box3().setFromObject(mesh),
          f = footprint(brick);
        expect(bounds.min.x).toBeCloseTo(brick.x, 1);
        expect(bounds.max.x).toBeCloseTo(brick.x + f.width, 1);
        expect(bounds.min.z).toBeCloseTo(brick.z, 1);
        expect(bounds.max.z).toBeCloseTo(brick.z + f.depth, 1);
        expect(bounds.min.y).toBeCloseTo(brick.y * PLATE_HEIGHT, 1);
        disposeObject(mesh);
      }
    },
  );
});
