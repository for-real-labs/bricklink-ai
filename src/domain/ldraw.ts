import { COLORS } from "./catalog";
import {
  MAX_FILE_SIZE,
  createBrick,
  projectSchema,
  type Project,
  type Brick,
} from "./model";
import { identity, multiply } from "./ldrawTransform";
const normalize = (name: string) =>
  name
    .toLowerCase()
    .replaceAll("\\", "/")
    .replace(/^parts\//, "");
/** Expand model subassemblies, retaining exact part matrices, color IDs and embedded geometry. */
export function parseLDraw(text: string, name = "Imported model"): Project {
  if (text.length > MAX_FILE_SIZE)
    throw new Error("Choose a model smaller than 16 MB.");
  const sections = new Map<string, string[]>();
  let current: string[] = [],
    root = current,
    first = true;
  for (const raw of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = raw.trim(),
      file = line.match(/^0\s+FILE\s+(.+)$/i);
    if (file) {
      const key = normalize(file[1]);
      if (
        !/^[a-z0-9_ .\/-]+$/i.test(key) ||
        key.includes("..") ||
        sections.has(key)
      )
        throw new Error("Invalid or duplicate LDraw file section.");
      current = [];
      sections.set(key, current);
      if (first && !root.some((l) => /^1\s/.test(l))) root = current;
      first = false;
    } else current.push(line);
  }
  if (sections.size > 4000)
    throw new Error("This model has too many embedded files.");
  // Bound embedded geometry and reject recursive part definitions before the renderer sees them.
  if (
    text.split(/\r?\n/).filter((line) => /^[2345]\s/.test(line)).length > 250000
  )
    throw new Error("Embedded geometry is too complex.");
  const checked = new Set<string>();
  const check = (file: string, parents: Set<string>) => {
    if (parents.has(file) || parents.size > 40)
      throw new Error("Circular or deeply nested part geometry.");
    if (checked.has(file)) return;
    for (const line of sections.get(file) ?? []) {
      if (!/^1\s/.test(line)) continue;
      const ref = normalize(line.split(/\s+/).slice(14).join(" "));
      if (sections.has(ref)) check(ref, new Set([...parents, file]));
    }
    checked.add(file);
  };
  for (const file of sections.keys()) check(file, new Set());
  const colors = new Map(COLORS.map((c) => [String(c.ldraw), c.hex]));
  for (const line of text.split(/\r?\n/)) {
    const color = line.match(
      /^0\s+!COLOUR\s+\S+\s+CODE\s+(\d+)\s+VALUE\s+(#[0-9a-f]{6})/i,
    );
    if (color) colors.set(color[1], color[2]);
  }
  const bricks: Brick[] = [];
  let maxStep = 1;
  const visit = (
    lines: string[],
    parent: number[],
    inherited: string,
    stack: Set<string>,
    inheritedStep = 1,
  ) => {
    let step = inheritedStep;
    for (const line of lines) {
      if (/^[2345]\s/.test(line))
        throw new Error(
          "Loose geometry in model sections is not supported. Keep custom geometry inside .dat part definitions before importing.",
        );
      if (/^0\s+(?:STEP|ROTSTEP)(?:\s|$)/i.test(line)) {
        if (++step > 100) throw new Error("Models support up to 100 steps.");
        continue;
      }
      if (!/^1\s/.test(line)) continue;
      const tokens = line.split(/\s+/),
        values = tokens.slice(2, 14).map(Number),
        file = normalize(tokens.slice(14).join(" "));
      if (
        values.length !== 12 ||
        values.some((v) => !Number.isFinite(v) || Math.abs(v) > 100000) ||
        !/^(?:\d{1,9}|0x[23][a-f0-9]{6})$/i.test(tokens[1])
      )
        throw new Error("Invalid LDraw part placement.");
      const color = tokens[1] === "16" ? inherited : tokens[1],
        transform = multiply(parent, values);
      if (sections.has(file) && !file.endsWith(".dat")) {
        if (stack.has(file) || stack.size >= 30)
          throw new Error("Circular or deeply nested submodel.");
        visit(
          sections.get(file)!,
          transform,
          color,
          new Set([...stack, file]),
          step,
        );
      } else {
        if (!/^[a-z0-9][a-z0-9_-]{0,79}\.dat$/i.test(file))
          throw new Error(
            `Missing or unsupported submodel: ${file.slice(0, 80)}`,
          );
        if (bricks.length >= 2000)
          throw new Error("Models support up to 2,000 parts.");
        const hex =
          colors.get(color) ??
          (/^0x[23]/i.test(color) ? `#${color.slice(3)}` : "#a7b0b4");
        const x = transform[0] / 20,
          y = -transform[1] / 8,
          z = transform[2] / 20;
        bricks.push({
          ...createBrick(file.slice(0, -4), hex, step),
          x,
          y,
          z,
          ldraw: {
            transform,
            colorCode: color,
            originalColor: hex,
            anchor: [x, y, z],
          },
        });
        maxStep = Math.max(maxStep, step);
      }
    }
  };
  visit(root, identity, "16", new Set());
  if (!bricks.length)
    throw new Error(
      "No LDraw parts were found. Export your model as .ldr or .mpd.",
    );
  // Keep part definitions and their attribution. Model subassemblies have been flattened above.
  const colorMetadata = text
    .split(/\r?\n/)
    .filter((line) => /^0\s+!COLOUR\s/i.test(line))
    .join("\n");
  const library =
    colorMetadata +
    "\n" +
    [...sections]
      .filter(([file]) => file.endsWith(".dat"))
      .map(([file, lines]) => `0 FILE ${file}\n${lines.join("\n")}\n`)
      .join("");
  const result = projectSchema.safeParse({
    version: 1,
    name: name.replace(/\.(ldr|mpd)$/i, "").slice(0, 80) || "Imported model",
    bricks,
    steps: maxStep,
    library,
  });
  if (!result.success)
    throw new Error(
      "This model exceeds the workspace bounds (256 studs / plate heights).",
    );
  return result.data;
}
