import type { Brick } from "./model";
import { COLORS } from "./catalog";
/** Row-major LDraw affine matrices, with translation first. */
export const identity = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1];
export function multiply(a: number[], b: number[]): number[] {
  const out = [0, 0, 0, ...Array(9).fill(0)];
  for (let row = 0; row < 3; row++) {
    out[row] = a[row];
    for (let k = 0; k < 3; k++) out[row] += a[3 + row * 3 + k] * b[k];
    for (let col = 0; col < 3; col++)
      for (let k = 0; k < 3; k++)
        out[3 + row * 3 + col] += a[3 + row * 3 + k] * b[3 + k * 3 + col];
  }
  return out;
}
export function importedTransform(b: Brick): number[] {
  const original = b.ldraw!;
  const c = Math.round(Math.cos((b.rotation * Math.PI) / 2)),
    s = Math.round(Math.sin((b.rotation * Math.PI) / 2));
  const transform = multiply(
    [0, 0, 0, c, 0, s, 0, 1, 0, -s, 0, c],
    [0, 0, 0, ...original.transform.slice(3)],
  );
  transform[0] = original.transform[0] + (b.x - original.anchor[0]) * 20;
  transform[1] = original.transform[1] - (b.y - original.anchor[1]) * 8;
  transform[2] = original.transform[2] + (b.z - original.anchor[2]) * 20;
  return transform;
}
export function exportImportedBrick(b: Brick): string {
  const color =
    b.color === b.ldraw!.originalColor
      ? b.ldraw!.colorCode
      : (COLORS.find((c) => c.hex === b.color)?.ldraw ??
        `0x2${b.color.slice(1)}`);
  return `1 ${color} ${importedTransform(b)
    .map((n) => Number(n.toFixed(6)))
    .join(" ")} ${b.partId}.dat`;
}
