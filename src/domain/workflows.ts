import { COLORS, getPart } from "./catalog";
import { importedTransform, multiply } from "./ldrawTransform";
import {
  canPlace,
  brickBounds,
  exportLDraw,
  footprint,
  type Brick,
  type Project,
} from "./model";

export type Axis = "x" | "y" | "z";
export function asLDraw(brick: Brick): Brick {
  if (brick.ldraw) {
    const transform = importedTransform(brick);
    return {
      ...brick,
      rotation: 0,
      ldraw: { ...brick.ldraw, transform, anchor: [brick.x, brick.y, brick.z] },
    };
  }
  const line = exportLDraw({
    version: 1,
    name: "part",
    steps: brick.step,
    bricks: [brick],
  })
    .split("\n")
    .find((line) => line.startsWith("1 "))!;
  const fields = line.split(" ");
  const transform = fields.slice(2, 14).map(Number);
  const x = transform[0] / 20,
    y = -transform[1] / 8,
    z = transform[2] / 20;
  return {
    ...brick,
    x,
    y,
    z,
    rotation: 0,
    ldraw: {
      transform,
      anchor: [x, y, z],
      colorCode: fields[1],
      originalColor: brick.color,
    },
  };
}

/** A shared physical pivot keeps assemblies intact. LDraw uses 20 units/stud and 8/plate. */
export function rotateAssembly(
  bricks: Brick[],
  axis: Axis,
  degrees: number,
): Brick[] {
  if (!bricks.length || !Number.isFinite(degrees) || Math.abs(degrees) > 360)
    throw new Error("Choose an angle from −360° to 360°.");
  const originals = bricks.map(asLDraw);
  const pivot = [0, 1, 2].map(
    (i) =>
      originals.reduce((sum, brick) => sum + brick.ldraw!.transform[i], 0) /
      originals.length,
  );
  const angle = (degrees * Math.PI) / 180,
    c = Math.cos(angle),
    s = Math.sin(angle);
  const rotation =
    axis === "x"
      ? [1, 0, 0, 0, c, -s, 0, s, c]
      : axis === "y"
        ? [c, 0, s, 0, 1, 0, -s, 0, c]
        : [c, -s, 0, s, c, 0, 0, 0, 1];
  return originals.map((brick) => {
    const original = brick.ldraw!.transform;
    const rotated = multiply(
      [0, 0, 0, ...rotation],
      [
        original[0] - pivot[0],
        original[1] - pivot[1],
        original[2] - pivot[2],
        ...original.slice(3),
      ],
    );
    for (let i = 0; i < 3; i++) rotated[i] += pivot[i];
    const [x, y, z] = [rotated[0] / 20, -rotated[1] / 8, rotated[2] / 20];
    return {
      ...brick,
      x,
      y,
      z,
      ldraw: { ...brick.ldraw!, transform: rotated, anchor: [x, y, z] },
    };
  });
}

export function matchingSelection(
  project: Project,
  selected: string[],
  mode: "type" | "color",
  step: number,
) {
  const values = new Set(
    project.bricks
      .filter((b) => selected.includes(b.id))
      .map((b) => (mode === "type" ? b.partId : b.color)),
  );
  return project.bricks
    .filter(
      (b) =>
        !b.hidden &&
        b.step <= step &&
        values.has(mode === "type" ? b.partId : b.color),
    )
    .map((b) => b.id);
}
export function expandGroups(bricks: Brick[], ids: string[]) {
  const groups = new Set(
    bricks.filter((b) => ids.includes(b.id) && b.group).map((b) => b.group),
  );
  return bricks
    .filter((b) => ids.includes(b.id) || (b.group && groups.has(b.group)))
    .map((b) => b.id);
}

export function pasteAssembly(
  project: Project,
  copied: Brick[],
  step: number,
  collision: boolean,
): { project: Project; ids: string[] } {
  if (!copied.length) throw new Error("Copy some parts first.");
  if (project.bricks.length + copied.length > 2000)
    throw new Error("This workspace supports up to 2,000 parts.");
  const width =
    Math.max(...copied.map((b) => b.x + footprint(b).width)) -
    Math.min(...copied.map((b) => b.x));
  const groups = new Map<string, string>();
  for (const brick of copied)
    if (brick.group && !groups.has(brick.group))
      groups.set(
        brick.group,
        `${brick.group.slice(0, 40)} copy ${crypto.randomUUID().slice(0, 6)}`,
      );
  for (let offset = 1; offset < 30; offset++) {
    const copies = copied.map((b) => ({
      ...structuredClone(b),
      id: crypto.randomUUID(),
      x: b.x + (width + 1) * offset,
      step,
      hidden: false,
      ...(b.group ? { group: groups.get(b.group) } : {}),
    }));
    if (copies.every((b) => canPlace(project.bricks, b, collision)))
      return {
        project: { ...project, bricks: [...project.bricks, ...copies] },
        ids: copies.map((b) => b.id),
      };
  }
  throw new Error(
    "No free space nearby. Move the original assembly or turn off collision checks.",
  );
}

export function moveStep(project: Project, from: number, to: number): Project {
  if (
    ![from, to].every(
      (n) => Number.isInteger(n) && n >= 1 && n <= project.steps,
    )
  )
    throw new Error("Invalid step.");
  const order = Array.from({ length: project.steps }, (_, i) => i + 1);
  order.splice(to - 1, 0, order.splice(from - 1, 1)[0]);
  return {
    ...project,
    bricks: project.bricks.map((b) => ({
      ...b,
      step: order.indexOf(b.step) + 1,
    })),
  };
}
export function deleteStep(project: Project, step: number): Project {
  if (project.steps <= 1 || step < 1 || step > project.steps)
    throw new Error("Keep at least one build step.");
  return {
    ...project,
    steps: project.steps - 1,
    bricks: project.bricks.map((b) => ({
      ...b,
      step:
        b.step === step
          ? Math.max(1, step - 1)
          : b.step > step
            ? b.step - 1
            : b.step,
    })),
  };
}

export interface ModelIssue {
  ids: string[];
  message: string;
}
export function checkModel(project: Project): {
  issues: ModelIssue[];
  approximateParts: number;
  truncated: boolean;
} {
  const visible = project.bricks.filter((b) => !b.hidden);
  const boxes = visible.map(brickBounds);
  const issues: ModelIssue[] = [];
  let truncated = false;
  pairs: for (let i = 0; i < visible.length; i++)
    for (let j = i + 1; j < visible.length; j++) {
      const a = boxes[i],
        b = boxes[j],
        epsilon = 0.001;
      if (
        a.x < b.maxX - epsilon &&
        a.maxX > b.x + epsilon &&
        a.y < b.maxY - epsilon &&
        a.maxY > b.y + epsilon &&
        a.z < b.maxZ - epsilon &&
        a.maxZ > b.z + epsilon
      ) {
        if (issues.length >= 100) {
          truncated = true;
          break pairs;
        }
        issues.push({
          ids: [visible[i].id, visible[j].id],
          message: `${getPart(visible[i].partId).name} overlaps ${getPart(visible[j].partId).name}`,
        });
      }
    }
  return {
    issues,
    approximateParts: visible.filter((b) => b.ldraw).length,
    truncated,
  };
}

/** Named subassemblies remain independent MPD sections; original geometry is retained. */
export function exportMpd(project: Project): string {
  const groups = [
    ...new Set(
      project.bricks
        .map((b) => b.group)
        .filter((group): group is string => Boolean(group)),
    ),
  ];
  if (!groups.length) return exportLDraw(project);
  const sections: string[] = [],
    root: Brick[] = project.bricks.filter((b) => !b.group);
  groups.forEach((group, index) => {
    const bricks = project.bricks.filter((b) => b.group === group),
      start = Math.min(...bricks.map((b) => b.step));
    const stem =
      group
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .slice(0, 45) || "assembly";
    const filename = `${stem}-${index + 1}.ldr`;
    sections.push(
      exportLDraw({
        version: 1,
        name: group,
        steps: project.steps - start + 1,
        bricks: bricks.map((b) => ({ ...b, step: b.step - start + 1 })),
      }).replace(
        "0 FILE brickbuilder-model.ldr",
        `0 FILE ${filename}\n0 !BRICKBUILDER GROUP ${JSON.stringify(group)}`,
      ),
    );
    // Temporary references are serialized below, never accepted as editable part IDs.
    root.push({
      ...bricks[0],
      id: `group-${index}`,
      partId: filename,
      step: start,
      group: undefined,
    });
  });
  const lines = [
    `0 FILE brickbuilder-model.ldr`,
    `0 ${project.name.replace(/[\r\n]/g, " ")}`,
    "0 BrickBuilder Studio model",
  ];
  let step = 1;
  for (const brick of root.sort((a, b) => a.step - b.step)) {
    while (step < brick.step) {
      lines.push("0 STEP");
      step++;
    }
    if (brick.id.startsWith("group-") && brick.partId.endsWith(".ldr"))
      lines.push(`1 16 0 0 0 1 0 0 0 1 0 0 0 1 ${brick.partId}`);
    else
      lines.push(
        exportLDraw({
          ...project,
          library: undefined,
          bricks: [{ ...brick, step: 1 }],
        })
          .split("\n")
          .find((line) => line.startsWith("1 "))!,
      );
  }
  return [...lines, ...sections, project.library ?? ""].join("\n") + "\n";
}

export function catalogBrick(
  partId: string,
  color: string,
  step: number,
  bounds?: number[],
): Brick {
  const part = getPart(partId),
    x = 0,
    y = bounds ? bounds[4] / 8 : part.height,
    z = 0;
  return {
    id: crypto.randomUUID(),
    partId,
    color,
    x,
    y,
    z,
    rotation: 0,
    step,
    hidden: false,
    ...(bounds ? { bounds } : {}),
    ldraw: {
      transform: [0, -y * 8, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
      anchor: [x, y, z],
      colorCode: String(
        COLORS.find((c) => c.hex === color)?.ldraw ?? `0x2${color.slice(1)}`,
      ),
      originalColor: color,
    },
  };
}
