import { SelectionTools } from "./SelectionTools";
import {
  Box,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Layers3,
  List,
  Minus,
  Plus,
  X,
  Check,
  ArrowUpRight,
  Package,
} from "lucide-react";
import { COLORS, getPart } from "../domain/catalog";
import { track } from "../analytics";
import { Button } from "./Button";
import type { Editor } from "../useEditor";
export function Inspector({ editor }: { editor: Editor }) {
  const {
    project,
    selected,
    setSelected,
    draft,
    color,
    snap,
    step,
    panel,
    setPanel,
    setModal,
    mobilePanel,
    setMobilePanel,
    first,
    commit,
    select,
    changeSelection,
    pickColor,
    changeStep,
  } = editor;
  return (
    <aside
      className={`inspector-panel ${mobilePanel === "inspector" ? "mobile-open" : ""}`}
      aria-label="Model inspector"
    >
      <div className="panel-heading">
        <div>
          <h2>Color palette</h2>
          <p>
            {COLORS.find(
              (c) => c.hex === (draft?.color ?? first?.color ?? color),
            )?.name ?? "Custom color"}
          </p>
        </div>
        <span
          className="current-color"
          style={{ background: draft?.color ?? first?.color ?? color }}
        />
        <Button
          label="Close inspector"
          className="mobile-only"
          onClick={() => setMobilePanel(null)}
        >
          <X size={17} />
        </Button>
      </div>
      <div className="color-grid">
        {COLORS.map((c) => (
          <button
            key={c.hex}
            aria-label={`Color ${c.name}`}
            title={c.name}
            style={{ background: c.hex }}
            className={
              (draft?.color ?? first?.color ?? color) === c.hex ? "chosen" : ""
            }
            onClick={() => pickColor(c.hex)}
          >
            {(draft?.color ?? first?.color ?? color) === c.hex && (
              <Check
                size={15}
                color={
                  ["White", "Cream", "Sunflower", "Sky"].includes(c.name)
                    ? "#333"
                    : "white"
                }
              />
            )}
          </button>
        ))}
      </div>
      {(editor.clipboard.length > 0 ||
        project.bricks.some((b) => b.hidden)) && (
        <div className="inspector-quick-actions">
          {editor.clipboard.length > 0 && (
            <Button label="Paste copied parts" onClick={() => editor.paste()}>
              Paste {editor.clipboard.length} parts
            </Button>
          )}
          {project.bricks.some((b) => b.hidden) && (
            <Button
              label="Restore hidden parts"
              onClick={() => editor.visibility("show")}
            >
              Show all parts
            </Button>
          )}
        </div>
      )}
      <div className="inspector-tabs">
        <Button
          label="Model parts"
          active={panel === "model"}
          onClick={() => setPanel("model")}
        >
          <Layers3 size={15} />
          Model<span>{project.bricks.length}</span>
        </Button>
        <Button
          label="Build steps"
          active={panel === "steps"}
          onClick={() => setPanel("steps")}
        >
          <List size={15} />
          Step list<span>{project.steps}</span>
        </Button>
      </div>
      <div className="model-list">
        {panel === "model" ? (
          <>
            <div className="model-root">
              <ChevronDown size={14} />
              <Box size={15} />
              <strong>{project.name}</strong>
            </div>
            {project.bricks.map((brick, index) => (
              <div
                key={brick.id}
                className={`model-row ${selected.includes(brick.id) ? "selected" : ""} ${brick.hidden ? "hidden-part" : ""}`}
              >
                <button
                  aria-label={`Select ${getPart(brick.partId).name} ${index + 1}`}
                  onClick={(e) =>
                    select(
                      brick.id,
                      e.shiftKey || e.metaKey || e.ctrlKey,
                      e.altKey,
                    )
                  }
                >
                  <span
                    className="mini-brick"
                    style={{ background: brick.color }}
                  />
                  <span
                    title={brick.group ? `Submodel: ${brick.group}` : undefined}
                  >
                    {brick.group && (
                      <em className="group-badge">{brick.group}</em>
                    )}
                    {getPart(brick.partId).name}
                  </span>
                  <small>{brick.step}</small>
                </button>
                <Button
                  label={`${brick.hidden ? "Show" : "Hide"} part ${index + 1}`}
                  onClick={() => {
                    commit({
                      ...project,
                      bricks: project.bricks.map((b) =>
                        b.id === brick.id ? { ...b, hidden: !b.hidden } : b,
                      ),
                    });
                  }}
                >
                  {brick.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                </Button>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="steps-list">
              {Array.from({ length: project.steps }, (_, index) => (
                <button
                  key={index}
                  className={step === index + 1 ? "selected" : ""}
                  onClick={() => changeStep(index + 1)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>Step {index + 1}</strong>
                    <small>
                      {
                        project.bricks.filter((b) => b.step === index + 1)
                          .length
                      }{" "}
                      parts
                    </small>
                  </div>
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
            <div className="step-actions">
              <Button
                label="Move step earlier"
                disabled={step <= 1}
                onClick={() => editor.reorderStep(-1)}
              >
                ↑ Earlier
              </Button>
              <Button
                label="Move step later"
                disabled={step >= project.steps}
                onClick={() => editor.reorderStep(1)}
              >
                ↓ Later
              </Button>
              <Button
                label="Delete current step"
                disabled={project.steps <= 1}
                onClick={editor.removeStep}
              >
                Delete step
              </Button>
            </div>
            <p className="step-note">
              Deleting a step keeps its parts in the adjacent step.
            </p>
            <Button
              label="Add build step"
              disabled={project.steps >= 100}
              className="add-step"
              onClick={() => {
                commit({ ...project, steps: project.steps + 1 });
                changeStep(project.steps + 1);
              }}
            >
              <Plus size={15} />
              Add step
            </Button>
          </>
        )}
        {!project.bricks.length && (
          <div className="empty-state">Your parts will appear here.</div>
        )}
      </div>
      <div className="selection-panel">
        <div className="section-label">
          {first
            ? `${selected.length} PART${selected.length === 1 ? "" : "S"} SELECTED`
            : "SELECTION"}
          {first && (
            <Button label="Clear selection" onClick={() => setSelected([])}>
              <X size={13} />
            </Button>
          )}
        </div>
        {first ? (
          <>
            <strong className="selected-name">
              {selected.length === 1
                ? getPart(first.partId).name
                : "Multiple parts"}
            </strong>
            <div className="position-fields">
              {(["x", "y", "z"] as const).map((axis) => (
                <label key={axis}>
                  <span>{axis.toUpperCase()}</span>
                  <input
                    aria-label={`Position ${axis.toUpperCase()}`}
                    type="number"
                    step={snap ? editor.gridSize : 0.25}
                    value={Number(first[axis].toFixed(3))}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (Number.isFinite(value))
                        changeSelection((b) => ({
                          ...b,
                          [axis]: b[axis] + value - first[axis],
                        }));
                    }}
                  />
                </label>
              ))}
            </div>
            <label className="step-select">
              Build step
              <select
                aria-label="Selected part build step"
                value={first.step}
                onChange={(e) =>
                  changeSelection((b) => ({
                    ...b,
                    step: Number(e.target.value),
                  }))
                }
              >
                {Array.from({ length: project.steps }, (_, i) => (
                  <option key={i} value={i + 1}>
                    Step {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <SelectionTools editor={editor} />
            <div className="selection-actions">
              <Button
                label="Lower selection"
                onClick={() =>
                  changeSelection((b) => ({
                    ...b,
                    y: Math.max(0, b.y - 1),
                  }))
                }
              >
                <Minus size={14} />
                Lower
              </Button>
              <Button
                label="Raise selection"
                onClick={() => changeSelection((b) => ({ ...b, y: b.y + 1 }))}
              >
                <Plus size={14} />
                Raise
              </Button>
            </div>
          </>
        ) : (
          <p>Select a brick to change its color, position, or build step.</p>
        )}
      </div>
      <button
        className="inventory-link"
        onClick={() => {
          setModal("inventory");
          track("inventory_opened");
        }}
      >
        <Package size={17} />
        <span>View parts list</span>
        <ArrowUpRight size={16} />
      </button>
    </aside>
  );
}
