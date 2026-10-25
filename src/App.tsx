import {
  Box,
  Camera,
  EyeOff,
  Home,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Copy,
  Download,
  FilePlus2,
  FolderOpen,
  Grid2X2,
  Hand,
  Layers3,
  Magnet,
  Maximize,
  MousePointer2,
  Move3D,
  Plus,
  Redo2,
  RotateCw,
  Save,
  ShieldCheck,
  Trash2,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
  Package,
  BookOpen,
} from "lucide-react";
import { PART_MAP } from "./domain/catalog";
import { Button } from "./components/Button";
import { Viewport } from "./components/Viewport";
import { useEditor } from "./useEditor";
import { PartsLibrary } from "./components/PartsLibrary";
import { Inspector } from "./components/Inspector";
import { EditorDialogs } from "./components/EditorDialogs";
import { EditorMenu } from "./components/EditorMenu";
export default function App() {
  const editor = useEditor();
  const {
    history,
    project,
    selected,
    draft,
    setDraft,
    snap,
    setSnap,
    collision,
    setCollision,
    grid,
    setGrid,
    step,
    tab,
    setTab,
    setModal,
    notice,
    setNotice,
    saved,
    mobilePanel,
    setMobilePanel,
    viewport,
    fileInput,
    first,
    rows,
    commit,
    announce,
    save,
    select,
    place,
    rotate,
    remove,
    duplicate,
    pickPart,
    openFile,
    undo,
    redo,
    changeStep,
  } = editor;
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-brand-menu">
          <a
            className="brand"
            href="#"
            onClick={(e) => e.preventDefault()}
            aria-label="BrickBuilder Studio home"
          >
            <strong>
              <span>BRICK</span>BUILDER
            </strong>
            <span className="studio-wordmark">studio</span>
          </a>
          <EditorMenu editor={editor} />
        </div>
        <div className="header-actions">
          <Button label="New project" onClick={() => setModal("new")}>
            <FilePlus2 size={17} />
          </Button>
          <Button
            label="Open project"
            onClick={() => fileInput.current?.click()}
          >
            <FolderOpen size={17} />
          </Button>
          <Button label="Save project" onClick={save}>
            <Save size={17} />
            <span>Save</span>
          </Button>
          <Button
            label="Export project"
            className="primary"
            onClick={() => setModal("export")}
          >
            <Download size={16} />
            <span>Export</span>
          </Button>
        </div>
      </header>
      <nav className="workspace-toolbar" aria-label="Building tools">
        <div className="editing-tools">
          <Button
            label="Undo (⌘Z)"
            disabled={!history.past.length}
            onClick={undo}
          >
            <Undo2 size={17} />
            <span>Undo</span>
          </Button>
          <Button
            label="Redo (⇧⌘Z)"
            disabled={!history.future.length}
            onClick={redo}
          >
            <Redo2 size={17} />
            <span>Redo</span>
          </Button>
          <i className="divider" />
          <Button
            label="Select (V)"
            active={!draft}
            onClick={() => setDraft(null)}
          >
            <MousePointer2 size={18} />
            <span>Select</span>
          </Button>
          <Button
            label="Move selected (M)"
            disabled={!first}
            active={!!draft && project.bricks.some((b) => b.id === draft.id)}
            onClick={() => first && setDraft({ ...first })}
          >
            <Move3D size={18} />
            <span>Move</span>
          </Button>
          <Button
            label="Rotate 90° (R)"
            disabled={!first && !draft}
            onClick={rotate}
          >
            <RotateCw size={17} />
            <span>Rotate</span>
          </Button>
          <Button label="Duplicate (⌘D)" disabled={!first} onClick={duplicate}>
            <Copy size={17} />
            <span>Clone</span>
          </Button>
          <Button
            label="Hide selection"
            disabled={!first}
            onClick={() =>
              commit({
                ...project,
                bricks: project.bricks.map((brick) =>
                  selected.includes(brick.id)
                    ? { ...brick, hidden: !brick.hidden }
                    : brick,
                ),
              })
            }
          >
            <EyeOff size={17} />
            <span>Hide</span>
          </Button>
          <Button label="Delete selection" disabled={!first} onClick={remove}>
            <Trash2 size={17} />
            <span>Delete</span>
          </Button>
        </div>
        <div className="scene-tools">
          <Button
            label="Snap to grid"
            active={snap}
            onClick={() => setSnap(!snap)}
          >
            <Magnet size={16} />
            <span>Snap</span>
          </Button>
          <Button
            label="Collision detection"
            active={collision}
            onClick={() => setCollision(!collision)}
          >
            <ShieldCheck size={16} />
            <span>Collision</span>
          </Button>
          <Button
            label="Toggle grid"
            active={grid}
            onClick={() => setGrid(!grid)}
          >
            <Grid2X2 size={16} />
            <span>Grid</span>
          </Button>
        </div>
        <div className="mode-tabs">
          <Button label="Capture model image" onClick={editor.exportImage}>
            <Camera size={18} />
            <span>Render</span>
          </Button>

          <Button
            label="Build mode"
            active={tab === "build"}
            onClick={() => {
              setTab("build");
              changeStep(project.steps);
            }}
          >
            <Box size={16} />
            Build
          </Button>
          <Button
            label="Instructions mode"
            active={tab === "instructions"}
            onClick={() => {
              setTab("instructions");
              changeStep(1);
            }}
          >
            <BookOpen size={16} />
            <span>Instructions</span>
          </Button>
        </div>
      </nav>
      <div className="document-bar">
        <Home size={15} aria-hidden="true" />
        <div className="document-title">
          <input
            aria-label="Project name"
            value={project.name}
            maxLength={80}
            onChange={(e) => {
              if (e.target.value.trim())
                commit({ ...project, name: e.target.value });
            }}
          />
          <span
            className={`saved-dot ${saved ? "" : "unsaved"}`}
            title={
              saved ? "Saved on this device" : "Save a file to keep your work"
            }
          />
        </div>
        <Button label="New model tab" onClick={() => setModal("new")}>
          <Plus size={16} />
        </Button>
        <span className="document-mode">
          {tab === "build" ? "Build mode" : "Instruction mode"}
        </span>
      </div>
      <main className="workspace">
        <PartsLibrary editor={editor} />
        <section className="canvas-panel" aria-label="Build area">
          <Viewport
            ref={viewport}
            bricks={project.bricks}
            selected={selected}
            draft={draft}
            snap={snap}
            collision={collision}
            grid={grid}
            step={step}
            onSelect={select}
            onPlace={place}
            onError={announce}
          />
          <div className="canvas-top">
            <span className="project-chip">
              <span className="live-dot" />
              {tab === "instructions"
                ? `BUILD GUIDE · STEP ${step}`
                : "PERSPECTIVE"}
            </span>
            <Button label="Keyboard shortcuts" onClick={() => setModal("help")}>
              <CircleHelp size={18} />
            </Button>
          </div>
          <div className="view-controls">
            <Button
              label="Isometric view"
              onClick={() => viewport.current?.view("perspective")}
            >
              <Box size={17} />
            </Button>
            <Button
              label="Top view"
              onClick={() => viewport.current?.view("top")}
            >
              <Grid2X2 size={17} />
            </Button>
            <Button
              label="Front view"
              onClick={() => viewport.current?.view("front")}
            >
              <Package size={17} />
            </Button>
            <i />
            <Button
              label="Fit model (F)"
              onClick={() => viewport.current?.frame()}
            >
              <Maximize size={17} />
            </Button>
            <Button label="Zoom in" onClick={() => viewport.current?.zoom(0.8)}>
              <ZoomIn size={17} />
            </Button>
            <Button
              label="Zoom out"
              onClick={() => viewport.current?.zoom(1.25)}
            >
              <ZoomOut size={17} />
            </Button>
          </div>
          {draft && (
            <div className="placement-hint">
              <span className="live-dot" />
              <strong>
                {project.bricks.some((b) => b.id === draft.id)
                  ? "Move"
                  : "Place"}{" "}
                {PART_MAP.get(draft.partId)!.name}
              </strong>
              <span>Click to place · R to rotate</span>
              <Button label="Cancel placement" onClick={() => setDraft(null)}>
                <X size={15} />
              </Button>
            </div>
          )}
          {!project.bricks.length && !draft && (
            <div className="welcome-card">
              <span className="welcome-icon">
                <Box size={28} />
              </span>
              <h1>Untitled model</h1>
              <p>
                Pick a part from the library,
                <br />
                then click anywhere to start building.
              </p>
              <Button
                label="Add your first brick"
                className="primary"
                onClick={() => pickPart("3001")}
              >
                <Plus size={16} />
                Add a brick
              </Button>
            </div>
          )}
          {tab === "instructions" && (
            <div className="instruction-card">
              <div>
                <span>BUILDING INSTRUCTIONS</span>
                <h2>
                  Step {String(step).padStart(2, "0")}{" "}
                  <small>/ {String(project.steps).padStart(2, "0")}</small>
                </h2>
                <p>
                  {project.bricks.filter((b) => b.step === step).length} new
                  parts in this step
                </p>
              </div>
              <div>
                <Button
                  label="Previous step"
                  disabled={step === 1}
                  onClick={() => changeStep(step - 1)}
                >
                  <ChevronLeft size={18} />
                </Button>
                <Button
                  label="Next step"
                  disabled={step === project.steps}
                  onClick={() => changeStep(step + 1)}
                >
                  <ChevronRight size={18} />
                </Button>
              </div>
            </div>
          )}
          <div className="canvas-bottom">
            <span>
              <Hand size={13} />
              Drag to orbit <b>·</b> Scroll to zoom <b>·</b> Shift-drag to pan
            </span>
            <span className="axis-indicator">
              <i>X</i>
              <i>Y</i>
              <i>Z</i>
            </span>
          </div>
        </section>
        <Inspector editor={editor} />
      </main>
      <footer className="status-bar">
        <span>
          <span className="status-light" />
          {saved ? "Saved on this device" : "Local save unavailable"}
        </span>
        <span>
          {project.bricks.length} parts<i>·</i>
          {rows.length} unique<i>·</i>
          {project.steps} steps
        </span>
        <span>
          {window.brickbuilderStudioDesktop
            ? "DESKTOP WORKSPACE"
            : "WEB WORKSPACE"}
          <span className="version">v0.1</span>
        </span>
      </footer>
      <nav className="mobile-nav">
        <Button
          label="Show parts library"
          active={mobilePanel === "parts"}
          onClick={() =>
            setMobilePanel(mobilePanel === "parts" ? null : "parts")
          }
        >
          <Box size={17} />
          Parts
        </Button>
        <Button
          label="Show model inspector"
          active={mobilePanel === "inspector"}
          onClick={() =>
            setMobilePanel(mobilePanel === "inspector" ? null : "inspector")
          }
        >
          <Layers3 size={17} />
          Model & colors
        </Button>
      </nav>
      <input
        ref={fileInput}
        type="file"
        accept=".json,.brickbuilder.json"
        aria-label="Import project file"
        hidden
        onChange={(e) => void openFile(e.target.files?.[0])}
      />
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <Button label="Dismiss notification" onClick={() => setNotice("")}>
            <X size={14} />
          </Button>
        </div>
      )}
      <EditorDialogs editor={editor} />
    </div>
  );
}
