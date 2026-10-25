import * as THREE from "three";
import { importedMesh } from "./ldrawGeometry";
import { catalogBrick } from "../domain/workflows";
import { disposeObject } from "./geometry";
let renderer: THREE.WebGLRenderer | undefined;
let queue: Promise<unknown> = Promise.resolve();
const cache = new Map<string, Promise<string>>();
/** One shared renderer, queued and lazy: never a WebGL context per catalog card. */
export function partThumbnail(partId: string): Promise<string> {
  const cached = cache.get(partId);
  if (cached) return cached;
  const promise = queue.then(async () => {
    renderer ??= new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(144, 100);
    renderer.setClearColor(0, 0);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight("#ffffff", "#aaaabb", 2.8));
    const light = new THREE.DirectionalLight("#ffffff", 3);
    light.position.set(3, 6, 5);
    scene.add(light);
    const mesh = await importedMesh(
      catalogBrick(partId, "#bfc4cc", 1),
      false,
      false,
    );
    const bounds = new THREE.Box3().setFromObject(mesh),
      center = bounds.getCenter(new THREE.Vector3());
    mesh.position.sub(center);
    scene.add(mesh);
    const radius = Math.max(
      bounds.getBoundingSphere(new THREE.Sphere()).radius,
      0.1,
    );
    const camera = new THREE.OrthographicCamera(
      -radius * 1.5,
      radius * 1.5,
      radius * 1.05,
      -radius * 1.05,
      0.01,
      radius * 20 + 10,
    );
    camera.position
      .set(1.3, 1, 1.6)
      .normalize()
      .multiplyScalar(radius * 5 + 1);
    camera.lookAt(0, 0, 0);
    try {
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL("image/png");
    } finally {
      disposeObject(scene);
    }
  });
  queue = promise.catch(() => {});
  cache.set(partId, promise);
  if (cache.size > 250) cache.delete(cache.keys().next().value!);
  return promise;
}
