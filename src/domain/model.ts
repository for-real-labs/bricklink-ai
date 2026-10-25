import { z } from "zod";
import { PART_MAP, COLORS } from "./catalog";
export interface Brick {
  id: string;
  partId: string;
  color: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  step: number;
  hidden: boolean;
}
export interface Project {
  version: 1;
  name: string;
  bricks: Brick[];
  steps: number;
}
const position = z.number().finite().min(-256).max(256);
const brickSchema = z.object({
  id: z.string().min(1).max(100),
  partId: z.string().refine((id) => PART_MAP.has(id), "Unknown part"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  x: position,
  z: position,
  y: z.number().finite().min(0).max(256),
  rotation: z.number().int().min(0).max(3),
  step: z.number().int().min(1).max(100),
  hidden: z.boolean(),
});
export const projectSchema = z
  .object({
    version: z.literal(1),
    name: z.string().trim().min(1).max(80),
    bricks: z.array(brickSchema).max(2000),
    steps: z.number().int().min(1).max(100),
  })
  .superRefine((p, ctx) => {
    if (new Set(p.bricks.map((b) => b.id)).size !== p.bricks.length)
      ctx.addIssue({ code: "custom", message: "Duplicate brick IDs" });
    if (p.bricks.some((b) => b.step > p.steps))
      ctx.addIssue({ code: "custom", message: "Invalid build step" });
  });
export const MAX_FILE_SIZE = 2_000_000;
export function parseProject(text: string): Project {
  if (text.length > MAX_FILE_SIZE)
    throw new Error("Project is too large (2 MB maximum).");
  const result = projectSchema.safeParse(JSON.parse(text));
  if (!result.success)
    throw new Error(`Invalid project: ${result.error.issues[0].message}`);
  return result.data;
}
export function createBrick(partId: string, color: string, step = 1): Brick {
  return {
    id: crypto.randomUUID(),
    partId,
    color,
    x: 0,
    y: 0,
    z: 0,
    rotation: 0,
    step,
    hidden: false,
  };
}
export function footprint(brick: Brick) {
  const part = PART_MAP.get(brick.partId)!;
  return {
    width: brick.rotation % 2 ? part.depth : part.width,
    depth: brick.rotation % 2 ? part.width : part.depth,
    height: part.height,
  };
}
export function collides(a: Brick, b: Brick) {
  if (a.id === b.id || a.hidden || b.hidden) return false;
  const aa = footprint(a),
    bb = footprint(b),
    e = 0.001;
  return (
    a.x < b.x + bb.width - e &&
    a.x + aa.width > b.x + e &&
    a.z < b.z + bb.depth - e &&
    a.z + aa.depth > b.z + e &&
    a.y < b.y + bb.height - e &&
    a.y + aa.height > b.y + e
  );
}
export function canPlace(
  bricks: Brick[],
  candidate: Brick,
  collision = true,
  ignored: string[] = [],
) {
  return (
    brickSchema.safeParse(candidate).success &&
    (!collision ||
      !bricks.some((b) => !ignored.includes(b.id) && collides(candidate, b)))
  );
}
export function snap(value: number, enabled = true) {
  return Math.round(value / (enabled ? 1 : 0.25)) * (enabled ? 1 : 0.25);
}
export function surfaceHeight(bricks: Brick[], candidate: Brick) {
  const f = footprint(candidate);
  return bricks
    .filter((b) => !b.hidden && b.id !== candidate.id)
    .reduce((height, b) => {
      const bf = footprint(b);
      return candidate.x < b.x + bf.width &&
        candidate.x + f.width > b.x &&
        candidate.z < b.z + bf.depth &&
        candidate.z + f.depth > b.z
        ? Math.max(height, b.y + bf.height)
        : height;
    }, 0);
}
export function inventory(project: Project) {
  const rows = new Map<
    string,
    { partId: string; name: string; color: string; quantity: number }
  >();
  for (const b of project.bricks) {
    const key = `${b.partId}:${b.color}`;
    const old = rows.get(key);
    rows.set(key, {
      partId: b.partId,
      name: PART_MAP.get(b.partId)!.name,
      color: b.color,
      quantity: (old?.quantity ?? 0) + 1,
    });
  }
  return [...rows.values()].sort((a, b) => a.partId.localeCompare(b.partId));
}
export function exportCsv(project: Project) {
  return (
    "Part ID,Part,Color,Quantity\n" +
    inventory(project)
      .map((r) => [r.partId, r.name, r.color, r.quantity].join(","))
      .join("\n")
  );
}
export function exportLDraw(project: Project) {
  const lines = [
    "0 Bricklink AI model",
    "0 Generated from original procedural part approximations",
  ];
  let lastStep = 1;
  for (const b of [...project.bricks].sort((a, b) => a.step - b.step)) {
    while (lastStep < b.step) {
      lines.push("0 STEP");
      lastStep++;
    }
    const f = footprint(b),
      isSlope = PART_MAP.get(b.partId)!.kind === "slope";
    const angle = ((b.rotation + (isSlope ? 2 : 0)) * Math.PI) / 2;
    const c = Math.round(Math.cos(angle)),
      s = Math.round(Math.sin(angle));
    const originX = (b.x + f.width / 2) * 20 + (isSlope ? s * 10 : 0);
    const originZ = (b.z + f.depth / 2) * 20 + (isSlope ? c * 10 : 0);
    const color =
      COLORS.find((col) => col.hex === b.color)?.ldraw ??
      `0x2${b.color.slice(1)}`;
    lines.push(
      `1 ${color} ${originX} ${-(b.y + f.height) * 8} ${originZ} ${c} 0 ${s} 0 1 0 ${-s} 0 ${c} ${b.partId}.dat`,
    );
  }
  return lines.join("\n") + "\n";
}
export function emptyProject(): Project {
  return { version: 1, name: "Untitled build", bricks: [], steps: 1 };
}
export function demoProject(): Project {
  const bricks: Brick[] = [];
  const add = (
    partId: string,
    color: string,
    x: number,
    y: number,
    z: number,
    rotation = 0,
    step = 1,
  ) => bricks.push({ ...createBrick(partId, color, step), x, y, z, rotation });
  // A tiny garden pavilion, built in four visible steps.
  add("41539", "#9cae86", -4, 0, -4);
  add("41539", "#9cae86", 4, 0, -4);
  add("3036", "#eadac0", -2, 1, -3, 0, 1);
  for (const x of [-2, 4])
    for (const z of [-3, 1]) {
      add("3003", "#eadac0", x, 2, z, 0, 2);
      add("3003", "#eadac0", x, 5, z, 0, 2);
    }
  add("3008", "#eadac0", -2, 8, -3, 0, 2);
  add("3008", "#eadac0", -2, 8, 2, 0, 2);
  for (const x of [-2, 0, 2, 4]) {
    add("3039", "#c85c42", x, 11, -3, 2, 3);
    add("3039", "#c85c42", x, 11, 1, 0, 3);
    add("3022", "#c85c42", x, 11, -1, 0, 3);
    add("3003", "#c85c42", x, 12, -1, 0, 3);
  }
  add("3010", "#365f4c", 0, 2, -2, 0, 4);
  add("2431", "#365f4c", 0, 5, -2, 0, 4);
  for (const x of [0, 2, 4]) add("3068b", "#f4f4ef", x, 1, 3, 0, 4);
  for (const [x, z] of [
    [-4, -2],
    [-4, 1],
    [7, -2],
    [7, 1],
  ]) {
    add("3062b", "#365f4c", x, 1, z, 0, 4);
    add("3941", "#365f4c", x - 0.5, 4, z - 0.5, 0, 4);
    add("4073", "#f5c842", x, 7, z, 0, 4);
  }
  return { version: 1, name: "Little garden pavilion", bricks, steps: 4 };
}
