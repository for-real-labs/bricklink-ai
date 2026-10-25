import { idsInRectangle } from "../scene/selection";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { importedMesh, setLDrawLibrary } from "../scene/ldrawGeometry";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildBrick, disposeObject, PLATE_HEIGHT } from "../scene/geometry";
import {
  canPlace,
  brickBounds,
  snap as snapValue,
  type Brick,
} from "../domain/model";
export interface ViewportHandle {
  frame: () => void;
  view: (view: "perspective" | "top" | "front") => void;
  image: () => string | undefined;
  zoom: (factor: number) => void;
}
interface Props {
  bricks: Brick[];
  library?: string;
  selected: string[];
  draft: Brick | null;
  snap: boolean;
  gridSize: number;
  boxSelect: boolean;
  collision: boolean;
  grid: boolean;
  step: number;
  onSelect: (id: string | null, multiple: boolean) => void;
  onSelectBox: (ids: string[], additive: boolean) => void;
  onPlace: (brick: Brick) => void;
  onError: (message: string) => void;
}
export const Viewport = forwardRef<ViewportHandle, Props>(
  function Viewport(props, ref) {
    const container = useRef<HTMLDivElement>(null);
    const latest = useRef(props);
    latest.current = props;
    const engine = useRef<{
      scene: THREE.Scene;
      renderer: THREE.WebGLRenderer;
      camera: THREE.PerspectiveCamera;
      controls: OrbitControls;
      model: THREE.Group;
      grid: THREE.GridHelper;
      ghost: THREE.Group | null;
      candidate: Brick | null;
      ground: THREE.Mesh;
      rebuild: () => void;
    } | null>(null);
    const [failed, setFailed] = useState(false);
    const [selectionRect, setSelectionRect] = useState<{
      left: number;
      top: number;
      width: number;
      height: number;
    } | null>(null);
    const frame = () => {
      const e = engine.current;
      if (!e) return;
      const box = new THREE.Box3().setFromObject(e.model);
      const center = box.isEmpty()
        ? new THREE.Vector3(0, 0, 0)
        : box.getCenter(new THREE.Vector3());
      const radius = box.isEmpty()
        ? 6
        : Math.max(box.getBoundingSphere(new THREE.Sphere()).radius, 4);
      const halfFov = Math.min(
        (e.camera.fov * Math.PI) / 360,
        Math.atan(Math.tan((e.camera.fov * Math.PI) / 360) * e.camera.aspect),
      );
      const distance = (radius / Math.sin(halfFov)) * 1.1;
      e.controls.target.copy(center);
      e.camera.position
        .copy(center)
        .add(
          new THREE.Vector3(1, 0.85, 1.25)
            .normalize()
            .multiplyScalar(Math.min(distance, 100)),
        );
      e.controls.update();
    };
    useImperativeHandle(ref, () => ({
      frame,
      view: (view) => {
        const e = engine.current;
        if (!e) return;
        const distance = e.camera.position.distanceTo(e.controls.target);
        e.camera.position
          .copy(e.controls.target)
          .add(
            (view === "top"
              ? new THREE.Vector3(0.001, 1, 0)
              : view === "front"
                ? new THREE.Vector3(0, 0.08, 1)
                : new THREE.Vector3(1, 0.85, 1.25)
            )
              .normalize()
              .multiplyScalar(distance),
          );
        e.controls.update();
      },
      image: () => {
        const e = engine.current;
        if (!e) return;
        e.renderer.render(e.scene, e.camera);
        return e.renderer.domElement.toDataURL("image/png");
      },
      zoom: (factor) => {
        const e = engine.current;
        if (!e) return;
        e.camera.position
          .sub(e.controls.target)
          .multiplyScalar(factor)
          .add(e.controls.target);
        e.controls.update();
      },
    }));
    useEffect(() => {
      const el = container.current!;
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          preserveDrawingBuffer: true,
        });
      } catch {
        setFailed(true);
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.setClearColor("#373737");
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      renderer.domElement.setAttribute("aria-label", "3D building workspace");
      renderer.domElement.setAttribute("role", "img");
      el.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog("#373737", 65, 130);
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 250);
      camera.position.set(24, 23, 30);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.12;
      controls.minDistance = 3;
      controls.maxDistance = 100;
      controls.maxPolarAngle = Math.PI * 0.48;
      controls.target.set(1, 2, 0);
      controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
      controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
      scene.add(new THREE.HemisphereLight("#ffffff", "#adb6a0", 2.8));
      const sun = new THREE.DirectionalLight("#fff7e6", 3.5);
      sun.position.set(-15, 25, 15);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -30;
      sun.shadow.camera.right = 30;
      sun.shadow.camera.top = 30;
      sun.shadow.camera.bottom = -30;
      sun.shadow.normalBias = 0.025;
      scene.add(sun);
      const fill = new THREE.DirectionalLight("#d5e8ff", 1);
      fill.position.set(10, 12, -15);
      scene.add(fill);
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(500, 500),
        new THREE.MeshStandardMaterial({ color: "#202020", roughness: 1 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.035;
      ground.receiveShadow = true;
      scene.add(ground);
      const grid = new THREE.GridHelper(80, 80, "#626262", "#474747");
      grid.position.y = -0.02;
      scene.add(grid);
      const model = new THREE.Group();
      scene.add(model);
      const e = {
        scene,
        renderer,
        camera,
        controls,
        model,
        grid,
        ground,
        ghost: null as THREE.Group | null,
        candidate: null as Brick | null,
        rebuild: () => {},
      };
      let renderDirty = true;
      const changed = () => {
        renderDirty = true;
      };
      controls.addEventListener("change", changed);
      let revision = 0;
      let ghostRevision = 0;
      const movingIds = () =>
        latest.current.draft &&
        latest.current.bricks.some((b) => b.id === latest.current.draft!.id)
          ? latest.current.selected.includes(latest.current.draft.id)
            ? latest.current.selected
            : [latest.current.draft.id]
          : [];
      let previousIds = "";
      e.rebuild = () => {
        renderDirty = true;
        const currentRevision = ++revision;
        const ids = latest.current.bricks.map((b) => b.id).join(",");
        const shouldFrame = ids !== previousIds;
        previousIds = ids;
        let pending = latest.current.bricks.filter(
          (b) =>
            b.ldraw &&
            !b.hidden &&
            b.step <= latest.current.step &&
            !movingIds().includes(b.id),
        ).length;
        const loaded = () => {
          renderDirty = true;
          pending--;
          if (pending === 0 && shouldFrame) frame();
        };
        setLDrawLibrary(latest.current.library ?? "");
        for (const child of [...model.children]) {
          model.remove(child);
          disposeObject(child);
        }
        const p = latest.current;
        for (const brick of p.bricks)
          if (
            !brick.hidden &&
            brick.step <= p.step &&
            !movingIds().includes(brick.id)
          )
            if (brick.ldraw) {
              void importedMesh(brick, p.selected.includes(brick.id), false)
                .then((mesh) => {
                  if (engine.current !== e || revision !== currentRevision) {
                    disposeObject(mesh);
                    return;
                  }
                  model.add(mesh);
                  loaded();
                })
                .catch(() => {
                  if (engine.current !== e || revision !== currentRevision)
                    return;
                  model.add(buildBrick(brick, p.selected.includes(brick.id)));
                  loaded();
                  p.onError(
                    `Part ${brick.partId} preview unavailable. Its original LDraw data is preserved; a placeholder is shown.`,
                  );
                });
            } else model.add(buildBrick(brick, p.selected.includes(brick.id)));
        grid.visible = p.grid;
        controls.mouseButtons.LEFT =
          p.draft || p.boxSelect ? null : THREE.MOUSE.ROTATE;
        ghostRevision++;
        if (e.ghost) {
          scene.remove(e.ghost);
          disposeObject(e.ghost);
          e.ghost = null;
        }
        e.candidate = null;
      };
      engine.current = e;
      e.rebuild();
      const raycaster = new THREE.Raycaster(),
        pointer = new THREE.Vector2(),
        plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      function cast(event: PointerEvent) {
        const rect = el.getBoundingClientRect();
        pointer.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          (-(event.clientY - rect.top) / rect.height) * 2 + 1,
        );
        raycaster.setFromCamera(pointer, camera);
        return raycaster.intersectObjects(model.children, true);
      }
      function brickId(object: THREE.Object3D): string | undefined {
        let current: THREE.Object3D | null = object;
        while (current) {
          if (current.userData.brickId) return current.userData.brickId;
          current = current.parent;
        }
        return undefined;
      }
      function move(event: PointerEvent) {
        const p = latest.current;
        if (p.boxSelect && selecting) {
          const rect = el.getBoundingClientRect();
          setSelectionRect({
            left: Math.min(down.x, event.clientX) - rect.left,
            top: Math.min(down.y, event.clientY) - rect.top,
            width: Math.abs(event.clientX - down.x),
            height: Math.abs(event.clientY - down.y),
          });
          return;
        }
        if (!p.draft) return;
        const hits = cast(event);
        const hit = hits[0];
        const target = hit
          ? p.bricks.find((b) => b.id === brickId(hit.object))
          : undefined;
        const y = target ? brickBounds(target).maxY : 0;
        plane.constant = -y * PLATE_HEIGHT;
        const point = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
        if (!point) return;
        const moving = p.bricks.filter((b) => movingIds().includes(b.id));
        const originals = moving.length ? moving : [p.draft];
        const bounds = originals.map(brickBounds);
        const minX = Math.min(...bounds.map((b) => b.x)),
          minY = Math.min(...bounds.map((b) => b.y)),
          minZ = Math.min(...bounds.map((b) => b.z));
        const width = Math.max(...bounds.map((b) => b.maxX)) - minX,
          depth = Math.max(...bounds.map((b) => b.maxZ)) - minZ;
        const candidate = {
          ...p.draft,
          x:
            snapValue(point.x - width / 2, p.snap, p.gridSize) +
            p.draft.x -
            minX,
          z:
            snapValue(point.z - depth / 2, p.snap, p.gridSize) +
            p.draft.z -
            minZ,
          y: y + p.draft.y - minY,
        };
        e.candidate = candidate;
        if (e.ghost) {
          scene.remove(e.ghost);
          disposeObject(e.ghost);
        }
        const token = ++ghostRevision;
        e.ghost = new THREE.Group();
        scene.add(e.ghost);
        renderDirty = true;
        const ghost = e.ghost;
        for (const original of originals) {
          const item = {
            ...original,
            x: original.x + candidate.x - p.draft.x,
            y: original.y + candidate.y - p.draft.y,
            z: original.z + candidate.z - p.draft.z,
            ...(original.id === candidate.id
              ? { rotation: candidate.rotation }
              : {}),
          };
          const valid = canPlace(p.bricks, item, p.collision, movingIds());
          if (!item.ldraw) ghost.add(buildBrick(item, false, true, valid));
          else
            void importedMesh(item, false, true)
              .then((mesh) => {
                if (engine.current !== e || token !== ghostRevision) {
                  disposeObject(mesh);
                  return;
                }
                if (!valid)
                  mesh.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                      const materials = Array.isArray(child.material)
                        ? child.material
                        : [child.material];
                      for (const material of materials)
                        if ("color" in material)
                          (material as THREE.MeshStandardMaterial).color.set(
                            "#ef4444",
                          );
                    }
                  });
                ghost.add(mesh);
                renderDirty = true;
              })
              .catch(() => {
                if (token === ghostRevision) {
                  ghost.add(buildBrick(item, false, true, valid));
                  renderDirty = true;
                }
              });
        }
      }
      let down = { x: 0, y: 0 };
      let selecting = false;
      const pointerDown = (event: PointerEvent) => {
        down = { x: event.clientX, y: event.clientY };
        if (
          event.button === 0 &&
          latest.current.boxSelect &&
          !latest.current.draft
        ) {
          selecting = true;
          renderer.domElement.setPointerCapture(event.pointerId);
        }
      };
      const pointerUp = (event: PointerEvent) => {
        if (selecting) {
          selecting = false;
          setSelectionRect(null);
          const rect = el.getBoundingClientRect();
          if (!latest.current.boxSelect) return;
          const ids = idsInRectangle(model.children, camera, rect, down, {
            x: event.clientX,
            y: event.clientY,
          });
          latest.current.onSelectBox(
            ids,
            event.shiftKey || event.metaKey || event.ctrlKey,
          );
          return;
        }
        if (
          event.button !== 0 ||
          Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5
        )
          return;
        const p = latest.current;
        if (p.draft) {
          move(event);
          if (e.candidate) {
            if (canPlace(p.bricks, e.candidate, p.collision, movingIds()))
              p.onPlace(e.candidate);
            else p.onError("That space is occupied. Try another position.");
          }
        } else {
          const hit = cast(event)[0];
          p.onSelect(
            hit ? (brickId(hit.object) ?? null) : null,
            event.shiftKey || event.metaKey || event.ctrlKey,
          );
        }
      };
      const pointerCancel = () => {
        selecting = false;
        setSelectionRect(null);
      };
      const lost = () => {
        setFailed(true);
        latest.current.onError(
          "The 3D context was lost. Save your project and reload.",
        );
      };
      renderer.domElement.addEventListener("webglcontextlost", lost);
      renderer.domElement.addEventListener("pointermove", move);
      renderer.domElement.addEventListener("pointerdown", pointerDown);
      renderer.domElement.addEventListener("pointerup", pointerUp);
      renderer.domElement.addEventListener("pointercancel", pointerCancel);
      const resize = new ResizeObserver(() => {
        const w = el.clientWidth,
          h = el.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / Math.max(h, 1);
        camera.updateProjectionMatrix();
        frame();
      });
      resize.observe(el);
      let animation = 0;
      const render = () => {
        animation = requestAnimationFrame(render);
        controls.update();
        if (renderDirty) {
          renderer.render(scene, camera);
          renderDirty = false;
        }
      };
      render();
      frame();
      return () => {
        cancelAnimationFrame(animation);
        resize.disconnect();
        controls.removeEventListener("change", changed);
        controls.dispose();
        renderer.domElement.removeEventListener("webglcontextlost", lost);
        renderer.domElement.removeEventListener("pointermove", move);
        renderer.domElement.removeEventListener("pointerdown", pointerDown);
        renderer.domElement.removeEventListener("pointerup", pointerUp);
        renderer.domElement.removeEventListener("pointercancel", pointerCancel);
        disposeObject(scene);
        renderer.dispose();
        el.removeChild(renderer.domElement);
        engine.current = null;
      };
    }, []);
    useEffect(() => {
      engine.current?.rebuild();
    }, [
      props.bricks,
      props.library,
      props.selected,
      props.draft,
      props.grid,
      props.step,
      props.collision,
      props.snap,
      props.gridSize,
      props.boxSelect,
    ]);
    return (
      <div
        ref={container}
        className={`viewport ${props.draft || props.boxSelect ? "placing" : ""}`}
        data-testid="viewport"
      >
        {selectionRect && (
          <div className="selection-rectangle" style={selectionRect} />
        )}
        {props.boxSelect && (
          <div className="box-select-hint">
            Drag a box · Shift adds to selection
          </div>
        )}
        {failed && (
          <div className="graphics-error">
            WebGL is unavailable. Enable hardware acceleration to use the 3D
            workspace. You can still save your project.
          </div>
        )}
      </div>
    );
  },
);
