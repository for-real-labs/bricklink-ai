import { disposeObject } from "./geometry";
import * as THREE from "three";
import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { LDrawConditionalLineMaterial } from "three/addons/materials/LDrawConditionalLineMaterial.js";
import { importedTransform } from "../domain/ldrawTransform";
import type { Brick } from "../domain/model";
const LIBRARY =
  "https://cdn.jsdelivr.net/gh/pybricks/ldraw@c43ed06a128a10ed65675166bf42eb6fd608b9b0/";
let sourceLibrary = "";
const templates = new Map<string, Promise<THREE.Group>>();
export function setLDrawLibrary(library: string) {
  if (sourceLibrary === library) return;
  sourceLibrary = library;
  for (const promise of templates.values())
    void promise.then(disposeObject).catch(() => {});
  templates.clear();
}
function template(part: string, color: string): Promise<THREE.Group> {
  const key = `${part}:${color}`;
  if (!templates.has(key)) {
    const manager = new THREE.LoadingManager();
    manager.setURLModifier((url) => {
      if (
        !url.startsWith(LIBRARY) ||
        !/^[-a-zA-Z0-9_/.]+$/.test(url.slice(LIBRARY.length)) ||
        url.slice(LIBRARY.length).includes("..")
      )
        throw new Error("Unsupported LDraw resource.");
      return url;
    });
    const loader = new LDrawLoader(manager);
    loader.setPartsLibraryPath(LIBRARY);
    loader.setConditionalLineMaterial(LDrawConditionalLineMaterial);
    const body = `0 FILE preview.ldr\n1 ${color} 0 0 0 1 0 0 0 1 0 0 0 1 ${part}.dat\n${sourceLibrary}`;
    templates.set(
      key,
      new Promise((resolve, reject) => {
        loader
          .preloadMaterials(`${LIBRARY}LDConfig.ldr`)
          .then(() => loader.parse(body, resolve, reject))
          .catch(reject);
      }),
    );
  }
  return templates.get(key)!;
}
export async function importedMesh(
  brick: Brick,
  selected: boolean,
  ghost: boolean,
): Promise<THREE.Group> {
  const color =
    brick.color === brick.ldraw!.originalColor
      ? brick.ldraw!.colorCode
      : `0x2${brick.color.slice(1)}`;
  const base = await template(brick.partId, color),
    shape = base.clone(true);
  // Cloned geometry/material ownership permits disposal on every editor rebuild.
  shape.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
      child.geometry = child.geometry.clone();
      child.material = Array.isArray(child.material)
        ? child.material.map((m) => m.clone())
        : child.material.clone();
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const material of materials) {
        if (ghost) {
          material.transparent = true;
          material.opacity *= 0.55;
        }
      }
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  const m = importedTransform(brick);
  shape.applyMatrix4(
    new THREE.Matrix4().set(
      m[3],
      m[4],
      m[5],
      m[0],
      m[6],
      m[7],
      m[8],
      m[1],
      m[9],
      m[10],
      m[11],
      m[2],
      0,
      0,
      0,
      1,
    ),
  );
  const group = new THREE.Group();
  group.scale.set(0.05, -0.05, 0.05);
  group.add(shape);
  group.userData.brickId = brick.id;
  if (selected) {
    const box = new THREE.BoxHelper(shape, 0xff4b4b);
    group.add(box);
  }
  return group;
}
