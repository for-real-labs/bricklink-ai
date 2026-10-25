import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildBrick, disposeObject, PLATE_HEIGHT } from "../scene/geometry";
import {
  canPlace,
  footprint,
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
  selected: string[];
  draft: Brick | null;
  snap: boolean;
  collision: boolean;
  grid: boolean;
  step: number;
  onSelect: (id: string | null, multiple: boolean) => void;
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
      e.rebuild = () => {
        for (const child of [...model.children]) {
          model.remove(child);
          disposeObject(child);
        }
        const p = latest.current;
        for (const brick of p.bricks)
          if (!brick.hidden && brick.step <= p.step && brick.id !== p.draft?.id)
            model.add(buildBrick(brick, p.selected.includes(brick.id)));
        grid.visible = p.grid;
        controls.mouseButtons.LEFT = p.draft ? null : THREE.MOUSE.ROTATE;
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
        if (!p.draft) return;
        const hits = cast(event);
        const hit = hits[0];
        const target = hit
          ? p.bricks.find((b) => b.id === brickId(hit.object))
          : undefined;
        const y = target ? target.y + footprint(target).height : 0;
        plane.constant = -y * PLATE_HEIGHT;
        const point = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
        if (!point) return;
        const f = footprint(p.draft),
          candidate = {
            ...p.draft,
            x: snapValue(point.x - f.width / 2, p.snap),
            z: snapValue(point.z - f.depth / 2, p.snap),
            y,
          };
        e.candidate = candidate;
        if (e.ghost) {
          scene.remove(e.ghost);
          disposeObject(e.ghost);
        }
        e.ghost = buildBrick(
          candidate,
          false,
          true,
          canPlace(p.bricks, candidate, p.collision),
        );
        scene.add(e.ghost);
      }
      let down = { x: 0, y: 0 };
      const pointerDown = (event: PointerEvent) => {
        down = { x: event.clientX, y: event.clientY };
      };
      const pointerUp = (event: PointerEvent) => {
        if (
          event.button !== 0 ||
          Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5
        )
          return;
        const p = latest.current;
        if (p.draft) {
          move(event);
          if (e.candidate) {
            if (canPlace(p.bricks, e.candidate, p.collision))
              p.onPlace(e.candidate);
            else p.onError("That space is occupied. Try another position.");
          }
        } else {
          const hit = cast(event)[0];
          p.onSelect(
            hit ? (brickId(hit.object) ?? null) : null,
            event.shiftKey,
          );
        }
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
        renderer.render(scene, camera);
      };
      render();
      frame();
      return () => {
        cancelAnimationFrame(animation);
        resize.disconnect();
        controls.dispose();
        renderer.domElement.removeEventListener("webglcontextlost", lost);
        renderer.domElement.removeEventListener("pointermove", move);
        renderer.domElement.removeEventListener("pointerdown", pointerDown);
        renderer.domElement.removeEventListener("pointerup", pointerUp);
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
      props.selected,
      props.draft,
      props.grid,
      props.step,
      props.collision,
      props.snap,
    ]);
    return (
      <div
        ref={container}
        className={`viewport ${props.draft ? "placing" : ""}`}
        data-testid="viewport"
      >
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
