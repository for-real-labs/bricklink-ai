import { nativeStudioLink } from "../integrations/actions";
import {
  Box,
  Download,
  List,
  Plus,
  Save,
  X,
  ArrowUpRight,
  Camera,
} from "lucide-react";
import { COLORS } from "../domain/catalog";
import {
  demoProject,
  emptyProject,
  exportCsv,
  exportLDraw,
} from "../domain/model";
import { download } from "../files";
import { track } from "../analytics";
import { Button } from "./Button";
import type { Editor } from "../useEditor";
export function EditorDialogs({ editor }: { editor: Editor }) {
  const {
    project,
    modal,
    setModal,
    rows,
    safeName,
    save,
    restore,
    exportImage,
  } = editor;
  return (
    <>
      {" "}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            className={`modal ${modal === "inventory" ? "wide" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "help"
                ? "Getting started"
                : modal === "export"
                  ? "Export your creation"
                  : modal === "new"
                    ? "Start a new project"
                    : modal === "bricklink"
                      ? "Open in BrickLink"
                      : "Parts list"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              label="Close dialog"
              className="modal-close"
              onClick={() => setModal(null)}
            >
              <X size={18} />
            </Button>
            {modal === "help" && (
              <>
                <span className="eyebrow">BRICKBUILDER STUDIO</span>
                <h1>Building basics</h1>
                <p>
                  Choose a part, move into the workspace, and click to place it.
                  Keep clicking to add more. Parts snap to the ground or stack
                  on the brick beneath your cursor.
                </p>
                <div className="shortcut-grid">
                  {[
                    ["R", "Rotate 90°"],
                    ["M", "Move selection"],
                    ["Esc", "Cancel placement"],
                    ["⌘ / Ctrl + D", "Duplicate"],
                    ["⌘ / Ctrl + Z", "Undo"],
                    ["⇧ + ⌘ / Ctrl + Z", "Redo"],
                    ["Arrow keys", "Move one stud"],
                    ["Page ↑ / ↓", "Raise / lower"],
                    ["F", "Fit model"],
                    ["Shift + click", "Select multiple"],
                    ["Delete", "Remove selection"],
                    ["⌘ / Ctrl + S", "Save project"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <span>{label}</span>
                      <kbd>{key}</kbd>
                    </div>
                  ))}
                </div>
                <p className="fine-print">
                  Orbit: drag or right-drag. Pan: Shift-drag or middle-drag.
                  Touch: one finger orbits; two fingers pan and zoom. Desktop
                  recommended for detailed builds. Independent software, not
                  affiliated with BrickLink or the LEGO Group. Imported geometry
                  uses the LDraw.org Parts Library, © its contributing authors,
                  under CC BY 4.0 / CC0.
                </p>
                <Button
                  label="Start building"
                  className="primary"
                  onClick={() => setModal(null)}
                >
                  Let’s build
                  <ArrowUpRight size={16} />
                </Button>
              </>
            )}
            {modal === "new" && (
              <>
                <span className="eyebrow">A FRESH START</span>
                <h1>What will you build?</h1>
                <p>
                  This replaces the current workspace. Save a project file first
                  if you want to keep it.
                </p>
                <div className="dialog-actions">
                  <Button label="Save current project first" onClick={save}>
                    <Save size={17} />
                    Save current
                  </Button>
                  <Button
                    label="Create empty project"
                    className="primary"
                    onClick={() => restore(emptyProject())}
                  >
                    <Plus size={17} />
                    Blank canvas
                  </Button>
                  <Button
                    label="Load example project"
                    onClick={() => restore(demoProject())}
                  >
                    <Box size={17} />
                    Garden pavilion
                  </Button>
                </div>
              </>
            )}
            {modal === "export" && (
              <>
                <span className="eyebrow">BRICKBUILDER STUDIO</span>
                <h1>Export model</h1>
                <p>
                  Save your creation, capture the view, or get ready to build it
                  in real life.
                </p>
                <div className="export-options">
                  <button
                    onClick={() => {
                      save();
                      setModal(null);
                      track("exported", { format: "json" });
                    }}
                  >
                    <Save />
                    <span>
                      <strong>Project file</strong>
                      <small>
                        Editable .brickbuilder.json · all parts and steps
                      </small>
                    </span>
                    <Download size={17} />
                  </button>
                  <button
                    onClick={() => {
                      exportImage();
                      track("exported", { format: "png" });
                    }}
                  >
                    <Camera />
                    <span>
                      <strong>Image</strong>
                      <small>PNG of the current 3D view</small>
                    </span>
                    <Download size={17} />
                  </button>
                  <button
                    onClick={() => {
                      download(
                        exportCsv(project),
                        `${safeName}-parts.csv`,
                        "text/csv",
                      );
                      setModal(null);
                      track("exported", { format: "csv" });
                    }}
                  >
                    <List />
                    <span>
                      <strong>Parts list</strong>
                      <small>
                        CSV with part numbers, colors, and quantities
                      </small>
                    </span>
                    <Download size={17} />
                  </button>
                  <button
                    onClick={() => {
                      download(
                        exportLDraw(project),
                        `${safeName}.ldr`,
                        "text/plain",
                      );
                      setModal(null);
                      track("exported", { format: "ldraw" });
                    }}
                  >
                    <Box />
                    <span>
                      <strong>BrickLink Studio / LDraw</strong>
                      <small>
                        .ldr · open directly in native BrickLink Studio
                      </small>
                    </span>
                    <Download size={17} />
                  </button>
                </div>
              </>
            )}
            {modal === "bricklink" && (
              <>
                <span className="eyebrow">NATIVE BRICKLINK STUDIO</span>
                <h1>Open in BrickLink</h1>
                <p>
                  Use the BrickBuilder Studio desktop app to hand this model to
                  native BrickLink Studio. Both desktop apps must be installed.
                  Native Studio may show its own startup or update prompts.
                </p>
                <div className="dialog-actions">
                  {!window.brickbuilderStudioDesktop && (
                    <Button
                      label="Launch desktop bridge"
                      className="primary"
                      onClick={() => {
                        try {
                          window.location.href = nativeStudioLink(project);
                          track("desktop_bridge_launched");
                        } catch (error) {
                          editor.announce(
                            error instanceof Error
                              ? error.message
                              : "Download the LDraw file instead.",
                          );
                        }
                      }}
                    >
                      Open installed desktop app
                    </Button>
                  )}
                  <Button
                    label="Download for BrickLink Studio"
                    onClick={() => {
                      download(
                        exportLDraw(project),
                        `${safeName}.ldr`,
                        "text/plain",
                      );
                      track("exported", {
                        format: "ldraw",
                        destination: "bricklink",
                      });
                    }}
                  >
                    Download .ldr
                  </Button>
                </div>
                {!window.brickbuilderStudioDesktop && (
                  <p className="fine-print">
                    <a
                      href="https://github.com/for-real-labs/bricklink-ai/releases/tag/v0.2.0"
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => track("desktop_download_clicked")}
                    >
                      Get the BrickBuilder Studio desktop app
                    </a>{" "}
                    · Early preview for Apple Silicon Mac; unsigned.
                  </p>
                )}
                <p className="fine-print">
                  If the desktop link does not open, download .ldr and choose
                  File → Open in BrickLink Studio. To return here, use File →
                  Export As → LDraw in native Studio, then open the exported
                  .ldr or .mpd in BrickBuilder Studio.
                </p>
                <p className="fine-print">
                  BrickLink Studio has no documented browser URL protocol. This
                  link uses the BrickBuilder Studio desktop bridge. On Linux,
                  export the file and open it in your preferred LDraw tool.
                </p>
              </>
            )}
            {modal === "inventory" && (
              <>
                <span className="eyebrow">BRICKBUILDER STUDIO</span>
                <h1>Parts list</h1>
                <p>
                  {project.bricks.length} parts across {rows.length}{" "}
                  part-and-color combinations.
                </p>
                <div className="inventory-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Part</th>
                        <th>Color</th>
                        <th>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.partId + row.color}>
                          <td>
                            <strong>{row.name}</strong>
                            <small>{row.partId}</small>
                          </td>
                          <td>
                            <span
                              className="color-dot"
                              style={{ background: row.color }}
                            />
                            {COLORS.find((c) => c.hex === row.color)?.name ??
                              row.color}
                          </td>
                          <td>{row.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button
                  label="Download parts CSV"
                  className="primary"
                  onClick={() =>
                    download(
                      exportCsv(project),
                      `${safeName}-parts.csv`,
                      "text/csv",
                    )
                  }
                >
                  <Download size={16} />
                  Download CSV
                </Button>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
