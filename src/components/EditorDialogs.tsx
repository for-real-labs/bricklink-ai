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
                  affiliated with BrickLink or the LEGO Group.
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
                      <strong>LDraw model</strong>
                      <small>
                        .ldr for compatible tools · approximate colors
                      </small>
                    </span>
                    <Download size={17} />
                  </button>
                </div>
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
