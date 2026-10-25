import { useEffect, useReducer, useRef, useState } from "react";
import { COLORS, getPart, searchParts } from "./domain/catalog";
import { readModelFile } from "./domain/studioFile";
import { measurePart } from "./scene/ldrawGeometry";
import {
  catalogBrick,
  deleteStep,
  expandGroups,
  matchingSelection,
  moveStep,
  pasteAssembly,
  rotateAssembly,
  type Axis,
} from "./domain/workflows";
import {
  canPlace,
  createBrick,
  demoProject,
  inventory,
  parseProject,
  type Brick,
  type Project,
} from "./domain/model";
import { historyReducer } from "./domain/history";
import type { ViewportHandle } from "./components/Viewport";
import { download, imageBlob } from "./files";
import { parseLDraw } from "./domain/ldraw";
import { receiveModel, BUILDER_ORIGIN } from "./integrations/transfer";
import { transferToBrickBuilder } from "./integrations/actions";
import { exportLDraw } from "./domain/model";
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
    [collision, setCollision] = useState(
      () => !project.bricks.some((brick) => brick.ldraw),
    ),
    [grid, setGrid] = useState(true);
  const [gridSize, setGridSize] = useState(1),
    [boxSelect, setBoxSelect] = useState(false);
  const [libraryMode, setLibraryMode] = useState(true),
    [catalogLoading, setCatalogLoading] = useState(false);
  const [clipboard, setClipboard] = useState<Brick[]>([]);
  const partRequest = useRef(0);
  const [step, setStep] = useState(project.steps),
    [tab, setTab] = useState<"build" | "instructions">("build"),
    [panel, setPanel] = useState<"model" | "steps">("model");
  const [modal, setModal] = useState<
      "help" | "export" | "new" | "inventory" | "bricklink" | "check" | null
    >(null),
    [notice, setNotice] = useState(""),
    [saved, setSaved] = useState(true),
    [mobilePanel, setMobilePanel] = useState<"parts" | "inspector" | null>(
      null,
    );
  const [transferring, setTransferring] = useState(false);
  const viewport = useRef<ViewportHandle>(null),
    fileInput = useRef<HTMLInputElement>(null);
  const selectedBricks = project.bricks.filter((b) => selected.includes(b.id));
  const first = selectedBricks[0];
  const visibleParts = searchParts(query, category, libraryMode),
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
  function select(id: string | null, multiple = false, individual = false) {
    partRequest.current++;
    setDraft(null);
    const ids = id
      ? individual
        ? [id]
        : expandGroups(project.bricks, [id]).filter((key) =>
            project.bricks.some(
              (b) => b.id === key && !b.hidden && b.step <= step,
            ),
          )
      : [];
    setSelected(
      multiple
        ? selected.includes(id ?? "")
          ? selected.filter((key) => !ids.includes(key))
          : [...new Set([...selected, ...ids])]
        : ids,
    );
    track("selection_changed", { count: id ? 1 : 0 });
  }
  function place(brick: Brick) {
    const moving = project.bricks.some((b) => b.id === brick.id);
    if (moving && selected.length > 1) {
      const anchor = project.bricks.find((b) => b.id === brick.id)!;
      applySelection(
        selectedBricks.map((b) => ({
          ...b,
          x: b.x + brick.x - anchor.x,
          y: b.y + brick.y - anchor.y,
          z: b.z + brick.z - anchor.z,
        })),
      );
      setDraft(null);
      return;
    }
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
    const moved = updated.some(
      (b, i) =>
        ["x", "y", "z", "rotation"].some(
          (key) => b[key as "x"] !== selectedBricks[i][key as "x"],
        ) || b.ldraw !== selectedBricks[i].ldraw,
    );
    applySelection(updated, moved);
  }
  function applySelection(updated: Brick[], detectCollision = true) {
    if (!updated.length) return;
    if (
      updated.some(
        (b) =>
          !canPlace(
            project.bricks.filter((b) => !selected.includes(b.id)),
            b,
            collision && detectCollision,
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
    if (
      draft &&
      selectedBricks.length > 1 &&
      project.bricks.some((b) => b.id === draft.id)
    )
      rotatePrecise("y", 90);
    else if (draft) setDraft({ ...draft, rotation: (draft.rotation + 1) % 4 });
    else if (selectedBricks.length > 1) rotatePrecise("y", 90);
    else changeSelection((b) => ({ ...b, rotation: (b.rotation + 1) % 4 }));
  }
  function rotatePrecise(axis: Axis, degrees: number) {
    try {
      applySelection(rotateAssembly(selectedBricks, axis, degrees));
      setDraft(null);
      track("assembly_rotated", { axis, degrees, count: selected.length });
    } catch (error) {
      announce((error as Error).message);
    }
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
    paste(selectedBricks);
  }
  function copy(cut = false) {
    if (!selectedBricks.length) return;
    setClipboard(structuredClone(selectedBricks));
    if (cut) remove();
    announce(
      `${selectedBricks.length} parts ${cut ? "cut" : "copied"}. Paste in this workspace.`,
    );
    track(cut ? "selection_cut" : "selection_copied", {
      count: selected.length,
    });
  }
  function paste(parts = clipboard) {
    try {
      const next = pasteAssembly(project, parts, step, collision);
      commit(next.project);
      setSelected(next.ids);
      setDraft(null);
      announce(
        `${next.ids.length} parts pasted. Use Move or the position fields to place them.`,
      );
      track("selection_pasted", { count: next.ids.length });
    } catch (error) {
      announce((error as Error).message);
    }
  }
  function selectMatching(mode: "type" | "color") {
    setDraft(null);
    setSelected(matchingSelection(project, selected, mode, step));
    track("select_matching", { mode });
  }
  function selectBox(ids: string[], additive: boolean) {
    const expanded = expandGroups(project.bricks, ids).filter((id) =>
      project.bricks.some((b) => b.id === id && !b.hidden && b.step <= step),
    );
    setSelected(additive ? [...new Set([...selected, ...expanded])] : expanded);
    track("box_selected", { count: expanded.length });
  }
  function groupSelection(name: string) {
    if (!name.trim() || !selected.length) return;
    changeSelection((b) => ({ ...b, group: name.trim().slice(0, 80) }));
    track("submodel_created", { count: selected.length });
  }
  function ungroup() {
    changeSelection((b) => ({ ...b, group: undefined }));
    track("submodel_released");
  }
  function visibility(action: "hide" | "isolate" | "show") {
    commit({
      ...project,
      bricks: project.bricks.map((b) => ({
        ...b,
        hidden:
          action === "show"
            ? false
            : action === "isolate"
              ? !selected.includes(b.id)
              : selected.includes(b.id) || b.hidden,
      })),
    });
    setDraft(null);
    track("visibility_changed", { action });
  }
  function reorderStep(direction: -1 | 1) {
    const target = step + direction;
    commit(moveStep(project, step, target));
    changeStep(target);
    track("step_moved", { from: step, to: target });
  }
  function removeStep() {
    commit(deleteStep(project, step));
    changeStep(Math.max(1, step - 1));
    announce("Step removed; its parts were kept in the adjacent step.");
    track("step_deleted");
  }
  function pickColor(hex: string) {
    setColor(hex);
    if (draft) setDraft({ ...draft, color: hex });
    else if (selected.length) changeSelection((b) => ({ ...b, color: hex }));
    track("color_selected", { color: hex });
  }
  async function pickPart(partId: string) {
    setBoxSelect(false);
    const request = ++partRequest.current;
    if (getPart(partId).ldraw) {
      setCatalogLoading(true);
      try {
        const bounds = await measurePart(partId);
        if (partRequest.current !== request) return;
        setDraft(catalogBrick(partId, color, step, bounds));
      } catch {
        if (partRequest.current === request)
          announce(
            "This part could not be loaded. Check your connection and try another part.",
          );
        return;
      } finally {
        setCatalogLoading(false);
      }
    } else setDraft(createBrick(partId, color, step));
    setSelected([]);
    setMobilePanel(null);
    setTab("build");
    track("part_picked", { part_id: partId });
  }
  function restore(next: Project) {
    partRequest.current++;
    setClipboard([]);
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
      const parsed = await readModelFile(file);
      if (parsed.bricks.some((b) => b.ldraw)) setCollision(false);
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
  useEffect(
    () =>
      receiveModel(
        BUILDER_ORIGIN,
        (model) => {
          try {
            const next = parseLDraw(model.content, model.name);
            restore(next);
            setCollision(false);
            announce(
              "Model imported. Original part transforms and colors are preserved.",
            );
            track("model_transfer_received", {
              part_count: next.bricks.length,
            });
          } catch (error) {
            announce(error instanceof Error ? error.message : "Import failed.");
          }
        },
        (error) => announce(error.message),
      ),
    [],
  );
  async function sendToBuilder(action: "edit" | "order") {
    if (transferring) return;
    setTransferring(true);
    track("brickbuilder_transfer_clicked", {
      action,
      part_count: project.bricks.length,
    });
    try {
      await transferToBrickBuilder(project, action);
      announce("Model sent to BrickBuilder.");
    } catch (error) {
      announce(
        error instanceof Error
          ? error.message
          : "Transfer failed. Export the LDraw file and import it in BrickBuilder.",
      );
    } finally {
      setTransferring(false);
    }
  }
  async function openInBrickLink() {
    setModal("bricklink");
    track("open_in_bricklink_clicked", {
      desktop: Boolean(window.brickbuilderStudioDesktop),
    });
    if (window.brickbuilderStudioDesktop) {
      try {
        await window.brickbuilderStudioDesktop.openInBrickLink({
          name: project.name,
          content: exportLDraw(project),
        });
        announce(
          "Native BrickLink Studio launch requested. Complete any startup prompts in Studio.",
        );
      } catch (error) {
        announce(
          error instanceof Error
            ? error.message
            : "Could not open native Studio. Download the LDraw file instead.",
        );
      }
    }
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
      } else if (
        modifier &&
        ["c", "x", "v"].includes(event.key.toLowerCase())
      ) {
        event.preventDefault();
        event.key.toLowerCase() === "v"
          ? paste()
          : copy(event.key.toLowerCase() === "x");
      } else if (modifier && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelected(
          project.bricks
            .filter((b) => !b.hidden && b.step <= step)
            .map((b) => b.id),
        );
      } else if (event.key === "Escape" || event.key.toLowerCase() === "v") {
        partRequest.current++;
        setDraft(null);
        setSelected([]);
        setBoxSelect(false);
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
        const amount = (snap ? gridSize : 0.25) * (event.shiftKey ? 10 : 1);
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
    gridSize,
    setGridSize,
    boxSelect,
    setBoxSelect,
    selectBox,
    libraryMode,
    setLibraryMode,
    catalogLoading,
    clipboard,
    copy,
    paste,
    selectMatching,
    rotatePrecise,
    groupSelection,
    ungroup,
    visibility,
    reorderStep,
    removeStep,
    transferring,
    sendToBuilder,
    openInBrickLink,
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
