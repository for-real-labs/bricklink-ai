import { useEffect, useReducer, useRef, useState } from "react";
import { COLORS, searchParts } from "./domain/catalog";
import {
  canPlace,
  createBrick,
  demoProject,
  footprint,
  inventory,
  MAX_FILE_SIZE,
  parseProject,
  type Brick,
  type Project,
} from "./domain/model";
import { historyReducer } from "./domain/history";
import type { ViewportHandle } from "./components/Viewport";
import { download, imageBlob } from "./files";
import { track } from "./analytics";
const STORAGE_KEY = "brickbuilder-studio.project.v1";
function initialProject() {
  try {
    // Read the previous autosave once so the product rename preserves local work.
    const saved =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem("bricklink-ai.project.v1");
    return saved ? parseProject(saved) : demoProject();
  } catch {
    return demoProject();
  }
}
export function useEditor() {
  const [history, dispatch] = useReducer(historyReducer, undefined, () => ({
    past: [],
    present: initialProject(),
    future: [],
  }));
  const project = history.present;
  const [selected, setSelected] = useState<string[]>([]),
    [draft, setDraft] = useState<Brick | null>(null),
    [color, setColor] = useState(COLORS[0].hex);
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("All parts"),
    [snap, setSnap] = useState(true),
    [collision, setCollision] = useState(true),
    [grid, setGrid] = useState(true);
  const [step, setStep] = useState(project.steps),
    [tab, setTab] = useState<"build" | "instructions">("build"),
    [panel, setPanel] = useState<"model" | "steps">("model");
  const [modal, setModal] = useState<
      "help" | "export" | "new" | "inventory" | null
    >(null),
    [notice, setNotice] = useState(""),
    [saved, setSaved] = useState(true),
    [mobilePanel, setMobilePanel] = useState<"parts" | "inspector" | null>(
      null,
    );
  const viewport = useRef<ViewportHandle>(null),
    fileInput = useRef<HTMLInputElement>(null);
  const selectedBricks = project.bricks.filter((b) => selected.includes(b.id));
  const first = selectedBricks[0];
  const visibleParts = searchParts(query, category),
    rows = inventory(project);
  const safeName =
    project.name.replace(/[^a-zA-Z0-9-_]/g, "-") || "brick-build";
  const commit = (next: Project) => dispatch({ type: "commit", project: next });
  const announce = (message: string) => setNotice(message);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      setSaved(true);
    } catch {
      setSaved(false);
      setNotice(
        "Local storage is full or unavailable. Save a project file to keep your work.",
      );
    }
  }, [project]);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timeout);
  }, [notice]);
  useEffect(() => {
    setStep((current) => Math.min(current, project.steps));
    setSelected((ids) =>
      ids.filter((id) => project.bricks.some((b) => b.id === id)),
    );
  }, [project.steps, project.bricks]);
  function save() {
    download(
      JSON.stringify(project, null, 2),
      `${safeName}.brickbuilder.json`,
      "application/json",
    );
    announce("Project file saved.");
  }
  function select(id: string | null, multiple = false) {
    setDraft(null);
    setSelected(
      id
        ? multiple
          ? selected.includes(id)
            ? selected.filter((item) => item !== id)
            : [...selected, id]
          : [id]
        : [],
    );
    track("selection_changed", { count: id ? 1 : 0 });
  }
  function place(brick: Brick) {
    const moving = project.bricks.some((b) => b.id === brick.id);
    if (!moving && project.bricks.length >= 2000) {
      announce("This workspace supports up to 2,000 parts.");
      return;
    }
    if (!canPlace(project.bricks, brick, collision)) {
      announce("That space is occupied.");
      return;
    }
    commit({
      ...project,
      bricks: moving
        ? project.bricks.map((b) => (b.id === brick.id ? brick : b))
        : [...project.bricks, brick],
    });
    setSelected([brick.id]);
    setDraft(moving ? null : { ...brick, id: crypto.randomUUID() });
    track(moving ? "part_moved" : "part_added", { part_id: brick.partId });
  }
  function changeSelection(transform: (b: Brick) => Brick) {
    const updated = selectedBricks.map(transform);
    if (
      updated.some(
        (b) =>
          !canPlace(
            [
              ...project.bricks.filter((b) => !selected.includes(b.id)),
              ...updated,
            ],
            b,
            collision,
          ),
      )
    ) {
      announce(
        "That change would overlap a part or leave the workspace bounds.",
      );
      return;
    }
    commit({
      ...project,
      bricks: project.bricks.map(
        (b) => updated.find((u) => u.id === b.id) ?? b,
      ),
    });
  }
  function rotate() {
    if (draft) setDraft({ ...draft, rotation: (draft.rotation + 1) % 4 });
    else changeSelection((b) => ({ ...b, rotation: (b.rotation + 1) % 4 }));
  }
  function remove() {
    if (!selected.length) return;
    commit({
      ...project,
      bricks: project.bricks.filter((b) => !selected.includes(b.id)),
    });
    setSelected([]);
    setDraft(null);
  }
  function duplicate() {
    if (!first || project.bricks.length + selectedBricks.length > 2000) return;
    const width =
      Math.max(...selectedBricks.map((b) => b.x + footprint(b).width)) -
      Math.min(...selectedBricks.map((b) => b.x));
    for (let offset = 1; offset < 30; offset++) {
      const copies = selectedBricks.map((b) => ({
        ...b,
        id: crypto.randomUUID(),
        x: b.x + (width + 1) * offset,
        step,
      }));
      if (copies.every((b) => canPlace(project.bricks, b, collision))) {
        commit({ ...project, bricks: [...project.bricks, ...copies] });
        setSelected(copies.map((b) => b.id));
        announce("Selection duplicated.");
        return;
      }
    }
    announce("No free space nearby for a duplicate.");
  }
  function pickColor(hex: string) {
    setColor(hex);
    if (draft) setDraft({ ...draft, color: hex });
    else if (selected.length) changeSelection((b) => ({ ...b, color: hex }));
    track("color_selected", { color: hex });
  }
  function pickPart(partId: string) {
    setDraft(createBrick(partId, color, step));
    setSelected([]);
    setMobilePanel(null);
    setTab("build");
    track("part_picked", { part_id: partId });
  }
  function restore(next: Project) {
    dispatch({ type: "reset", project: next });
    setSelected([]);
    setDraft(null);
    setStep(next.steps);
    setModal(null);
    setTimeout(() => viewport.current?.frame(), 100);
  }
  async function openFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > MAX_FILE_SIZE)
        throw new Error("Project is too large (2 MB maximum).");
      const parsed = parseProject(await file.text());
      restore(parsed);
      announce("Project opened.");
      track("project_opened", { part_count: parsed.bricks.length });
    } catch (error) {
      announce(
        error instanceof Error ? error.message : "Could not open this project.",
      );
    }
    if (fileInput.current) fileInput.current.value = "";
  }
  function exportImage() {
    const image = viewport.current?.image();
    if (!image) {
      announce("The 3D renderer is not available.");
      return;
    }
    download(imageBlob(image), `${safeName}.png`, "image/png");
    announce("Image exported.");
    setModal(null);
  }
  function undo() {
    dispatch({ type: "undo" });
    setDraft(null);
  }
  function redo() {
    dispatch({ type: "redo" });
    setDraft(null);
  }
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('input,textarea,select,[contenteditable="true"]')
      )
        return;
      if (modal) {
        if (event.key === "Escape") setModal(null);
        return;
      }
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
      } else if (modifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
      } else if (modifier && event.key.toLowerCase() === "o") {
        event.preventDefault();
        fileInput.current?.click();
      } else if (modifier && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicate();
      } else if (modifier && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelected(
          project.bricks
            .filter((b) => !b.hidden && b.step <= step)
            .map((b) => b.id),
        );
      } else if (event.key === "Escape" || event.key.toLowerCase() === "v") {
        setDraft(null);
        setSelected([]);
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        remove();
      } else if (event.key.toLowerCase() === "r") rotate();
      else if (event.key.toLowerCase() === "m" && first) {
        setDraft({ ...first });
      } else if (event.key.toLowerCase() === "f") viewport.current?.frame();
      else if (event.key === "?" || event.key.toLowerCase() === "h")
        setModal("help");
      else if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "PageUp",
          "PageDown",
        ].includes(event.key)
      ) {
        event.preventDefault();
        const amount = snap ? 1 : 0.25;
        changeSelection((b) => ({
          ...b,
          x:
            b.x +
            (event.key === "ArrowLeft"
              ? -amount
              : event.key === "ArrowRight"
                ? amount
                : 0),
          z:
            b.z +
            (event.key === "ArrowUp"
              ? -amount
              : event.key === "ArrowDown"
                ? amount
                : 0),
          y: Math.max(
            0,
            b.y +
              (event.key === "PageUp" ? 1 : event.key === "PageDown" ? -1 : 0),
          ),
        }));
      } else return;
      track("shortcut_used", { key: event.key });
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  });
  useEffect(() => {
    if (!modal) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input,select,a[href],[tabindex="0"]',
        ) ?? [],
      );
    focusable()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0],
        last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [modal]);
  useEffect(() =>
    window.brickbuilderStudioDesktop?.onMenu((action) => {
      if (action === "save") save();
      if (action === "open") fileInput.current?.click();
      if (action === "new") setModal("new");
      if (action === "export") setModal("export");
      if (action === "undo") undo();
      if (action === "redo") redo();
    }),
  );
  const changeStep = (value: number) => {
    setStep(value);
    setDraft(null);
    setSelected([]);
    track("step_selected", { step: value });
  };
  return {
    history,
    project,
    selected,
    setSelected,
    draft,
    setDraft,
    color,
    query,
    setQuery,
    category,
    setCategory,
    snap,
    setSnap,
    collision,
    setCollision,
    grid,
    setGrid,
    step,
    tab,
    setTab,
    panel,
    setPanel,
    modal,
    setModal,
    notice,
    setNotice,
    saved,
    mobilePanel,
    setMobilePanel,
    viewport,
    fileInput,
    selectedBricks,
    first,
    visibleParts,
    rows,
    safeName,
    commit,
    announce,
    save,
    select,
    place,
    changeSelection,
    rotate,
    remove,
    duplicate,
    pickColor,
    pickPart,
    restore,
    openFile,
    exportImage,
    undo,
    redo,
    changeStep,
  };
}
export type Editor = ReturnType<typeof useEditor>;
