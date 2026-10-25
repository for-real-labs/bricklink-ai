import partIndex from "./parts-index.json";
export type PartKind = "brick" | "plate" | "tile" | "slope" | "round";
export interface Part {
  id: string;
  name: string;
  width: number;
  depth: number;
  height: number;
  category: string;
  kind: PartKind;
  ldraw?: boolean;
}
const part = (
  id: string,
  name: string,
  width: number,
  depth: number,
  height: number,
  kind: PartKind = "brick",
): Part => ({
  id,
  name,
  width,
  depth,
  height,
  kind,
  category:
    kind === "brick"
      ? "Bricks"
      : kind === "plate"
        ? "Plates"
        : kind === "tile"
          ? "Tiles"
          : kind === "slope"
            ? "Slopes"
            : "Round",
});
// Dimensions are stud widths and plate heights. Meshes are original approximations.
export const PARTS: Part[] = [
  part("3001", "Brick 2 × 4", 4, 2, 3),
  part("3002", "Brick 2 × 3", 3, 2, 3),
  part("3003", "Brick 2 × 2", 2, 2, 3),
  part("3004", "Brick 1 × 2", 2, 1, 3),
  part("3005", "Brick 1 × 1", 1, 1, 3),
  part("3009", "Brick 1 × 6", 6, 1, 3),
  part("3010", "Brick 1 × 4", 4, 1, 3),
  part("3008", "Brick 1 × 8", 8, 1, 3),
  part("3020", "Plate 2 × 4", 4, 2, 1, "plate"),
  part("3021", "Plate 2 × 3", 3, 2, 1, "plate"),
  part("3022", "Plate 2 × 2", 2, 2, 1, "plate"),
  part("3023", "Plate 1 × 2", 2, 1, 1, "plate"),
  part("3024", "Plate 1 × 1", 1, 1, 1, "plate"),
  part("3031", "Plate 4 × 4", 4, 4, 1, "plate"),
  part("3032", "Plate 4 × 6", 6, 4, 1, "plate"),
  part("3036", "Plate 6 × 8", 8, 6, 1, "plate"),
  part("41539", "Plate 8 × 8", 8, 8, 1, "plate"),
  part("3068b", "Tile 2 × 2", 2, 2, 1, "tile"),
  part("3069b", "Tile 1 × 2", 2, 1, 1, "tile"),
  part("3070b", "Tile 1 × 1", 1, 1, 1, "tile"),
  part("2431", "Tile 1 × 4", 4, 1, 1, "tile"),
  part("3039", "Slope 45° 2 × 2", 2, 2, 3, "slope"),
  part("3040b", "Slope 45° 1 × 2", 1, 2, 3, "slope"),
  part("3062b", "Round brick 1 × 1", 1, 1, 3, "round"),
  part("3941", "Round brick 2 × 2", 2, 2, 3, "round"),
  part("4073", "Round plate 1 × 1", 1, 1, 1, "round"),
];
export const PART_MAP = new Map(PARTS.map((p) => [p.id, p]));
export const CATEGORIES = [
  "All parts",
  "Bricks",
  "Plates",
  "Tiles",
  "Slopes",
  "Round",
];
export const COLORS = [
  { name: "Terracotta", hex: "#c85c42", ldraw: 70 },
  { name: "Coral", hex: "#ee735c", ldraw: 4 },
  { name: "Sunflower", hex: "#f5c842", ldraw: 14 },
  { name: "Cream", hex: "#eadac0", ldraw: 19 },
  { name: "White", hex: "#f4f4ef", ldraw: 15 },
  { name: "Stone", hex: "#a7b0b4", ldraw: 71 },
  { name: "Graphite", hex: "#444a50", ldraw: 72 },
  { name: "Black", hex: "#22272d", ldraw: 0 },
  { name: "Sage", hex: "#9cae86", ldraw: 120 },
  { name: "Forest", hex: "#365f4c", ldraw: 288 },
  { name: "Mint", hex: "#83c5b4", ldraw: 323 },
  { name: "Ocean", hex: "#477f98", ldraw: 3 },
  { name: "Blue", hex: "#4c78ba", ldraw: 1 },
  { name: "Sky", hex: "#b8d9e6", ldraw: 9 },
  { name: "Lavender", hex: "#b5a2cf", ldraw: 31 },
  { name: "Rose", hex: "#e5b4bd", ldraw: 13 },
];
export function searchParts(query: string, category: string, library = false) {
  const normalized = query.toLowerCase().replace(/[×x\s]/g, "");
  return (library ? ALL_PARTS : PARTS).filter(
    (p) =>
      (category === "All parts" || p.category === category) &&
      `${p.id}${p.name}`
        .toLowerCase()
        .replace(/[×x\s]/g, "")
        .includes(normalized),
  );
}

export function getPart(id: string): Part {
  return (
    PART_MAP.get(id) ??
    LIBRARY_MAP.get(id) ?? {
      id,
      name: `LDraw part ${id}`,
      width: 2,
      depth: 2,
      height: 3,
      category: "Imported",
      kind: "brick",
    }
  );
}

function libraryCategory(name: string) {
  if (/^(Brick|Plate|Tile) Round/i.test(name)) return "Round";
  if (/^Technic/i.test(name)) return "Technic";
  if (/^(Minifig|Figure)/i.test(name)) return "Minifig";
  if (/^(Wheel|Tyre)/i.test(name)) return "Wheels";
  if (/^Tile/i.test(name)) return "Tiles";
  if (/^Plate/i.test(name)) return "Plates";
  if (/^Slope/i.test(name)) return "Slopes";
  if (/^Brick/i.test(name)) return "Bricks";
  return "Other";
}
export const LDRAW_PARTS: Part[] = partIndex
  .filter(([id]) => !PART_MAP.has(id))
  .map(([id, name]) => {
    const dimensions = name.match(/\b(\d+(?:\.\d+)?) x (\d+(?:\.\d+)?)/i);
    const category = libraryCategory(name);
    return {
      id,
      name,
      width: dimensions ? Math.min(64, Number(dimensions[2])) : 2,
      depth: dimensions ? Math.min(64, Number(dimensions[1])) : 2,
      height: category === "Plates" || category === "Tiles" ? 1 : 3,
      kind: "brick",
      category,
      ldraw: true,
    };
  });
const common = [
  "3700",
  "3701",
  "3702",
  "3705",
  "3706",
  "3710",
  "2780",
  "4274",
  "6141",
  "2357",
  "4070",
  "3034",
  "3029",
  "3794b",
  "4085c",
  "3666",
  "2420",
  "32000",
  "32054",
  "30136",
];
LDRAW_PARTS.sort((a, b) => {
  const rank = (id: string) => (common.includes(id) ? common.indexOf(id) : 100);
  return rank(a.id) - rank(b.id) || a.name.localeCompare(b.name);
});
export const ALL_PARTS = [...PARTS, ...LDRAW_PARTS];
const LIBRARY_MAP = new Map(LDRAW_PARTS.map((part) => [part.id, part]));
export const LIBRARY_CATEGORIES = [
  ...CATEGORIES,
  "Technic",
  "Minifig",
  "Wheels",
  "Other",
];
