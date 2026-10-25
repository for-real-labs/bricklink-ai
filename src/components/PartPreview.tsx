import type { Part } from "../domain/catalog";
export function PartPreview({
  part,
  color = "#c4c7cb",
}: {
  part: Part;
  color?: string;
}) {
  const width = part.width,
    depth = part.depth,
    h = part.height === 1 ? 7 : 17;
  const scale = Math.min(12, 60 / (width + depth));
  const project = (x: number, z: number, y: number) => [
    48 + (x - z) * scale,
    34 + (x + z) * scale * 0.48 - y,
  ];
  const a = project(-width / 2, -depth / 2, h),
    b = project(width / 2, -depth / 2, h),
    c = project(width / 2, depth / 2, h),
    d = project(-width / 2, depth / 2, h);
  const bottomB = project(width / 2, -depth / 2, 0),
    bottomC = project(width / 2, depth / 2, 0),
    bottomD = project(-width / 2, depth / 2, 0);
  const polygon = (points: number[][]) =>
    points.map((p) => p.join(",")).join(" ");
  return (
    <svg viewBox="0 0 96 66" aria-hidden="true">
      <g stroke="rgba(0,0,0,.07)" strokeLinejoin="round">
        <polygon points={polygon([d, c, bottomC, bottomD])} fill={color} />
        <polygon
          points={polygon([b, c, bottomC, bottomB])}
          fill={color}
          style={{ filter: "brightness(.78)" }}
        />
        <polygon
          points={polygon([a, b, c, d])}
          fill={color}
          style={{ filter: "brightness(1.13)" }}
        />
        {part.kind !== "tile" &&
          Array.from({ length: width * depth }, (_, i) => {
            const [x, y] = project(
              (i % width) - (width - 1) / 2,
              Math.floor(i / width) - (depth - 1) / 2,
              h,
            );
            return (
              <g key={i}>
                <ellipse
                  cx={x}
                  cy={y - 1}
                  rx={scale * 0.28}
                  ry={scale * 0.2}
                  fill={color}
                />
                <ellipse
                  cx={x}
                  cy={y - 3}
                  rx={scale * 0.28}
                  ry={scale * 0.16}
                  fill={color}
                  style={{ filter: "brightness(1.2)" }}
                />
              </g>
            );
          })}
      </g>
    </svg>
  );
}
