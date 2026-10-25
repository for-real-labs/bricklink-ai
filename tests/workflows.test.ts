import { describe, expect, it } from "vitest";
import { ALL_PARTS, searchParts } from "../src/domain/catalog";
import {
  brickBounds,
  collides,
  createBrick,
  emptyProject,
  exportLDraw,
  parseProject,
} from "../src/domain/model";
import { importedTransform } from "../src/domain/ldrawTransform";
import { parseLDraw } from "../src/domain/ldraw";
import {
  asLDraw,
  catalogBrick,
  checkModel,
  deleteStep,
  expandGroups,
  exportMpd,
  matchingSelection,
  moveStep,
  pasteAssembly,
  rotateAssembly,
} from "../src/domain/workflows";
const brick = (x = 0, step = 1) => ({
  ...createBrick("3001", "#c85c42", step),
  x,
});

describe("familiar Studio workflows", () => {
  it("searches the complete licensed index by name, ID, and category", () => {
    expect(ALL_PARTS.length).toBeGreaterThan(14000);
    expect(
      searchParts("3700", "All parts", true).some((p) => p.id === "3700"),
    ).toBe(true);
    expect(searchParts("axle", "Technic", true).length).toBeGreaterThan(10);
    expect(searchParts("1x2", "Plates", true).length).toBeGreaterThan(5);
  });
  it("positions a newly loaded part with its measured bottom on the floor", () => {
    const part = catalogBrick("3700", "#c85c42", 1, [-10, -4, -20, 10, 24, 20]);
    expect(brickBounds(part).y).toBeCloseTo(0);
    expect(brickBounds(part).maxX).toBeCloseTo(0.5);
    expect(
      parseProject(JSON.stringify({ ...emptyProject(), bricks: [part] }))
        .bricks[0].bounds,
    ).toEqual(part.bounds);
  });
  it.each(["x", "y", "z"] as const)(
    "rotates an assembly on %s without changing physical distances, then restores it",
    (axis) => {
      const originals = [brick(), { ...brick(8), y: 6, z: 3 }].map(asLDraw);
      const next = rotateAssembly(originals, axis, 37);
      const positions = (parts: typeof next) =>
        parts.map((b) => importedTransform(b).slice(0, 3));
      const distance = (parts: typeof next) =>
        Math.hypot(
          ...positions(parts)[0].map((n, i) => n - positions(parts)[1][i]),
        );
      expect(distance(next)).toBeCloseTo(distance(originals), 8);
      const restored = rotateAssembly(next, axis, -37);
      restored.forEach((b, i) =>
        importedTransform(b).forEach((n, k) =>
          expect(n).toBeCloseTo(importedTransform(originals[i])[k], 8),
        ),
      );
      expect(
        parseLDraw(exportLDraw({ ...emptyProject(), bricks: next })).bricks,
      ).toHaveLength(2);
    },
  );
  it("rejects non-finite angles and validates transformed coordinates", () => {
    expect(() => rotateAssembly([brick()], "x", NaN)).toThrow("angle");
    expect(() => rotateAssembly([brick()], "y", 500)).toThrow("angle");
  });
  it("selects matches only in visible steps and expands named assemblies", () => {
    const a = { ...brick(), group: "Roof" },
      b = { ...brick(5), group: "Roof" },
      c = { ...brick(10, 2), hidden: true };
    const project = { ...emptyProject(), steps: 2, bricks: [a, b, c] };
    expect(matchingSelection(project, [a.id], "type", 1)).toEqual([a.id, b.id]);
    expect(matchingSelection(project, [a.id], "color", 1)).toEqual([
      a.id,
      b.id,
    ]);
    expect(expandGroups(project.bricks, [a.id])).toEqual([a.id, b.id]);
  });
  it("pastes with fresh IDs, an independent group and exact LDraw orientation", () => {
    const a = { ...rotateAssembly([brick()], "z", 30)[0], group: "Roof" };
    const next = pasteAssembly(
      { ...emptyProject(), bricks: [a] },
      [a],
      1,
      false,
    );
    expect(next.project.bricks).toHaveLength(2);
    const pasted = next.project.bricks[1];
    expect(pasted.id).not.toBe(a.id);
    expect(pasted.group).not.toBe(a.group);
    expect(importedTransform(pasted).slice(3)).toEqual(
      importedTransform(a).slice(3),
    );
    expect(() =>
      pasteAssembly(
        {
          ...emptyProject(),
          bricks: Array.from({ length: 2000 }, () => brick()),
        },
        [a],
        1,
        false,
      ),
    ).toThrow("2,000");
  });
  it("reorders steps and deletes a step without losing its parts", () => {
    const original = {
      ...emptyProject(),
      steps: 3,
      bricks: [brick(0, 1), brick(5, 2), brick(10, 3)],
    };
    expect(moveStep(original, 3, 1).bricks.map((b) => b.step)).toEqual([
      2, 3, 1,
    ]);
    const next = deleteStep(original, 2);
    expect(next.bricks.map((b) => b.step)).toEqual([1, 1, 2]);
    expect(next.bricks.map((b) => b.id)).toEqual(
      original.bricks.map((b) => b.id),
    );
    expect(() => deleteStep(emptyProject(), 1)).toThrow("at least one");
  });
  it("exports named MPD submodels without dropping transforms, colors, or steps", () => {
    const original = {
      ...emptyProject(),
      steps: 3,
      bricks: [
        { ...brick(0, 2), group: "Roof" },
        { ...brick(5, 3), group: "Roof" },
        brick(10, 1),
      ],
    };
    const mpd = exportMpd(original);
    expect(mpd).toContain("0 FILE assembly-1.ldr");
    expect(mpd).toContain("0 Roof");
    const restored = parseLDraw(mpd);
    expect(restored.bricks).toHaveLength(3);
    expect(restored.bricks.map((b) => b.step).sort()).toEqual([1, 2, 3]);
    const placements = (text: string) =>
      text
        .split("\n")
        .filter((line) => line.startsWith("1 "))
        .sort();
    expect(placements(exportLDraw(restored))).toEqual(
      placements(exportLDraw(original)),
    );
    expect(restored.bricks.filter((b) => b.group)).toHaveLength(2);
  });
  it("detects overlaps, ignores hidden parts, and keeps rotated bounds finite", () => {
    const a = brick(),
      b = brick(1),
      hidden = { ...brick(), hidden: true };
    expect(
      checkModel({ ...emptyProject(), bricks: [a, b, hidden] }).issues,
    ).toHaveLength(1);
    expect(collides(a, hidden)).toBe(false);
    const rotated = rotateAssembly([a], "z", 90)[0];
    const bounds = brickBounds(rotated);
    expect(Object.values(bounds).every(Number.isFinite)).toBe(true);
    expect(bounds.maxX - bounds.x).toBeCloseTo(1.2);
  });
});
it('bounds model review output for heavily overlapping models', () => {
  const report = checkModel({ ...emptyProject(), bricks: Array.from({ length: 30 }, () => brick()) });
  expect(report.issues).toHaveLength(100);
  expect(report.truncated).toBe(true);
});
it('rejects reversed measured part bounds when reopening project data', () => {
  expect(() => parseProject(JSON.stringify({ ...emptyProject(), bricks: [{ ...brick(), bounds: [10, 0, 0, -10, 20, 20] }] }))).toThrow('Invalid part bounds');
});
