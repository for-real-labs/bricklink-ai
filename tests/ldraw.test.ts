import { describe, it, expect } from "vitest";
import { parseLDraw } from "../src/domain/ldraw";
import { exportLDraw, parseProject, demoProject } from "../src/domain/model";
const placement = "1 4 20 -24 40 1 0 0 0 1 0 0 0 1 3001.dat";
const lines = (text: string) =>
  text.split("\n").filter((l) => l.startsWith("1 "));
describe("LDraw round trip", () => {
  it("retains every demo placement, color and construction step through import and JSON autosave", () => {
    const source = exportLDraw(demoProject());
    const model = parseProject(JSON.stringify(parseLDraw(source, "Garden")));
    expect(lines(exportLDraw(model))).toEqual(lines(source));
    expect(model.bricks).toHaveLength(46);
    expect(model.steps).toBe(4);
  });
  it("expands nested models and inherited colors using full affine transforms", () => {
    const project = parseLDraw(
      `0 FILE main.ldr\n1 14 20 -8 10 0 0 1 0 1 0 -1 0 0 child.ldr\n0 FILE child.ldr\n1 16 10 0 20 1 0 0 0 1 0 0 0 1 3001.dat`,
    );
    expect(lines(exportLDraw(project))[0]).toBe(
      "1 14 40 -8 0 0 0 1 0 1 0 -1 0 0 3001.dat",
    );
  });
  it("keeps unlisted parts, arbitrary rotations, direct colors and part definitions without silently dropping them", () => {
    const source = "1 0x2abcdef 0 0 0 1 0 0 0 0 -1 0 1 0 custom.dat";
    const project = parseLDraw(
      `${source}\n0 FILE custom.dat\n0 Author: Test author\n3 16 0 0 0 10 0 0 0 10 0`,
    );
    expect(lines(exportLDraw(project))).toEqual([source]);
    expect(exportLDraw(project)).toContain("Author: Test author");
  });
  it("applies translation, rotation and color edits to imported parts", () => {
    const project = parseLDraw(placement);
    const b = project.bricks[0];
    b.x += 2;
    b.y += 1;
    b.rotation = 1;
    b.color = "#4c78ba";
    expect(lines(exportLDraw(project))[0]).toBe(
      "1 1 60 -32 40 0 0 1 0 1 0 -1 0 0 3001.dat",
    );
  });
  it.each([
    "1 4 NaN 0 0 1 0 0 0 1 0 0 0 1 3001.dat",
    "1 4 0 0 0 1 0 0 0 1 0 0 0 1 ../evil.dat",
    "0 FILE a.ldr\n1 4 0 0 0 1 0 0 0 1 0 0 0 1 a.ldr",
  ])("rejects malformed and circular models: %s", (text) =>
    expect(() => parseLDraw(text)).toThrow(),
  );
  it("rejects too many parts and unsupported submodel references", () => {
    expect(() => parseLDraw(`${placement}\n3 16 0 0 0 10 0 0 0 10 0`)).toThrow(
      "Loose geometry",
    );
    expect(() => parseLDraw(Array(2001).fill(placement).join("\n"))).toThrow(
      "2,000",
    );
    expect(() =>
      parseLDraw(placement.replace("3001.dat", "missing.ldr")),
    ).toThrow("Missing");
  });
});
it("rejects recursive embedded geometry in project JSON as well as LDraw imports", () => {
  const library = "0 FILE custom.dat\n1 16 0 0 0 1 0 0 0 1 0 0 0 1 custom.dat";
  expect(() => parseLDraw(placement + "\n" + library)).toThrow("Circular");
  expect(() =>
    parseProject(JSON.stringify({ ...demoProject(), library })),
  ).toThrow("Circular");
});
it("preserves custom color definitions in exports", () => {
  const model = parseLDraw(
    "0 !COLOUR Custom CODE 999 VALUE #123456 EDGE #111111\n" +
      placement.replace("1 4 ", "1 999 "),
  );
  expect(exportLDraw(model)).toContain(
    "0 !COLOUR Custom CODE 999 VALUE #123456 EDGE #111111",
  );
});
