import { describe, expect, it } from "vitest";
import { PARTS, searchParts } from "../src/domain/catalog";
import {
  canPlace,
  collides,
  createBrick,
  demoProject,
  emptyProject,
  exportCsv,
  exportLDraw,
  footprint,
  inventory,
  parseProject,
  snap,
  surfaceHeight,
} from "../src/domain/model";
const brick = () => createBrick("3001", "#c85c42");
describe("catalog", () => {
  it("finds parts by number, dimension, and category", () => {
    expect(searchParts("3001", "All parts")).toHaveLength(1);
    expect(searchParts("2x4", "Bricks")).toHaveLength(1);
    expect(searchParts("2 × 4", "All parts").length).toBeGreaterThan(1);
    expect(searchParts("nonsense", "All parts")).toEqual([]);
  });
  it("uses unique identifiers and valid dimensions", () => {
    expect(new Set(PARTS.map((p) => p.id)).size).toBe(PARTS.length);
    expect(PARTS.every((p) => p.width > 0 && p.depth > 0 && p.height > 0)).toBe(
      true,
    );
  });
});
describe("placement", () => {
  it("detects overlap and allows touching boundaries and stacking", () => {
    const a = brick(),
      b = brick();
    expect(collides(a, b)).toBe(true);
    expect(collides(a, { ...b, x: 4 })).toBe(false);
    expect(collides(a, { ...b, y: 3 })).toBe(false);
    expect(collides(a, { ...b, y: 2 })).toBe(true);
  });
  it("accounts for rotation", () => {
    const a = brick();
    expect(footprint({ ...a, rotation: 1 })).toEqual({
      width: 2,
      depth: 4,
      height: 3,
    });
    expect(collides({ ...a, rotation: 1 }, { ...brick(), x: 2 })).toBe(false);
  });
  it("ignores the moving brick and hidden parts", () => {
    const a = brick();
    expect(canPlace([a], a)).toBe(true);
    expect(canPlace([{ ...a, hidden: true }], brick())).toBe(true);
  });
  it("allows collision override but never invalid coordinates", () => {
    expect(canPlace([brick()], brick(), false)).toBe(true);
    expect(canPlace([], { ...brick(), x: Infinity }, false)).toBe(false);
    expect(canPlace([], { ...brick(), y: -1 }, false)).toBe(false);
  });
  it("snaps to stud or quarter-stud increments including negative positions", () => {
    expect(snap(1.6)).toBe(2);
    expect(snap(-1.6)).toBe(-2);
    expect(snap(1.6, false)).toBe(1.5);
  });
  it("finds the highest support under an overlapping footprint", () => {
    const base = brick();
    expect(surfaceHeight([base, { ...brick(), y: 3 }], brick())).toBe(6);
    expect(surfaceHeight([base], { ...brick(), x: 6 })).toBe(0);
  });
});
describe("project validation", () => {
  it("round-trips full projects without losing parts or steps", () => {
    const demo = demoProject();
    expect(parseProject(JSON.stringify(demo))).toEqual(demo);
  });
  it("rejects malformed JSON", () =>
    expect(() => parseProject("{broken")).toThrow());
  it.each([
    { partId: "unknown" },
    { color: "url(javascript:bad)" },
    { rotation: 4 },
    { x: NaN },
    { y: -1 },
    { step: 101 },
  ])("rejects invalid brick %j", (override) => {
    expect(() =>
      parseProject(
        JSON.stringify({
          ...emptyProject(),
          bricks: [{ ...brick(), ...override }],
        }),
      ),
    ).toThrow();
  });
  it("rejects duplicate IDs and nonexistent steps", () => {
    const a = brick();
    expect(() =>
      parseProject(JSON.stringify({ ...emptyProject(), bricks: [a, a] })),
    ).toThrow("Duplicate");
    expect(() =>
      parseProject(
        JSON.stringify({ ...emptyProject(), bricks: [{ ...a, step: 2 }] }),
      ),
    ).toThrow("step");
  });
  it("enforces size and count limits", () => {
    expect(() => parseProject(" ".repeat(16_000_001))).toThrow("large");
    expect(() =>
      parseProject(
        JSON.stringify({
          ...emptyProject(),
          bricks: Array.from({ length: 2001 }, brick),
        }),
      ),
    ).toThrow();
  });
  it("does not contain collisions in the demonstration build", () => {
    const demo = demoProject();
    for (const b of demo.bricks)
      expect(
        canPlace(demo.bricks, b),
        `Overlap at ${b.partId} ${b.x},${b.y},${b.z}`,
      ).toBe(true);
  });
});
describe("exports", () => {
  it("aggregates identical parts and separates colors", () => {
    const project = {
      ...emptyProject(),
      bricks: [brick(), brick(), { ...brick(), color: "#ffffff" }],
    };
    expect(
      inventory(project)
        .map((r) => r.quantity)
        .sort(),
    ).toEqual([1, 2]);
    expect(exportCsv(project)).toContain("3001,Brick 2 × 4,#c85c42,2");
  });
  it("exports LDraw transforms, all parts, and build steps", () => {
    const model = {
      ...emptyProject(),
      steps: 2,
      bricks: [brick(), { ...brick(), step: 2, x: 5, rotation: 1 }],
    };
    const text = exportLDraw(model);
    expect(text.match(/^1 /gm)).toHaveLength(2);
    expect(text).toContain("0 STEP");
    expect(text).toContain("3001.dat");
    expect(text).toContain("40 -24 20");
  });
  it("exports custom colors without interpreting user content", () => {
    expect(
      exportLDraw({
        ...emptyProject(),
        bricks: [{ ...brick(), color: "#123456" }],
      }),
    ).toContain("0x2123456");
  });
});
it("maps the LDraw slope origin and orientation to the procedural geometry", () => {
  const slope = createBrick("3039", "#c85c42");
  expect(exportLDraw({ ...emptyProject(), bricks: [slope] })).toContain(
    "20 -24 10 -1 0 0 0 1 0 0 0 -1 3039.dat",
  );
});
