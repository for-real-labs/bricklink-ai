import { useState } from "react";
import { Button } from "./Button";
import { track } from "../analytics";
import type { Axis } from "../domain/workflows";
import type { Editor } from "../useEditor";

export function SelectionTools({ editor }: { editor: Editor }) {
  const [axis, setAxis] = useState<Axis>("y"),
    [angle, setAngle] = useState("90"),
    [name, setName] = useState("Assembly");
  return (
    <div className="precision-tools">
      <div className="compact-actions">
        <Button label="Copy selected parts" onClick={() => editor.copy()}>
          Copy
        </Button>
        <Button label="Cut selected parts" onClick={() => editor.copy(true)}>
          Cut
        </Button>
        <Button
          label="Select same part type"
          onClick={() => editor.selectMatching("type")}
        >
          Same part
        </Button>
        <Button
          label="Select same color"
          onClick={() => editor.selectMatching("color")}
        >
          Same color
        </Button>
        <Button
          label="Isolate selection"
          onClick={() => editor.visibility("isolate")}
        >
          Isolate
        </Button>
      </div>
      <details
        onToggle={(event) =>
          track("precision_panel_toggled", { open: event.currentTarget.open })
        }
      >
        <summary>Rotate & submodels</summary>
        <p>
          Rotate around the selection’s shared center. Angles use LDraw axes.
        </p>
        <div className="rotation-fields">
          <select
            aria-label="Rotation axis"
            value={axis}
            onChange={(event) => {
              setAxis(event.target.value as Axis);
              track("rotation_axis_selected", { axis: event.target.value });
            }}
          >
            <option value="x">X axis</option>
            <option value="y">Y axis</option>
            <option value="z">Z axis</option>
          </select>
          <input
            aria-label="Rotation angle"
            type="number"
            min="-360"
            max="360"
            value={angle}
            onChange={(event) => setAngle(event.target.value)}
          />
          <Button
            label="Apply precise rotation"
            disabled={
              !angle ||
              !Number.isFinite(Number(angle)) ||
              Math.abs(Number(angle)) > 360
            }
            onClick={() => editor.rotatePrecise(axis, Number(angle))}
          >
            Rotate °
          </Button>
        </div>
        <label className="submodel-name">
          Submodel name
          <input
            aria-label="Submodel name"
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        {editor.first?.group && (
          <p className="current-group">In: {editor.first.group}</p>
        )}
        <div className="compact-actions">
          <Button
            label="Create submodel"
            disabled={!name.trim()}
            onClick={() => editor.groupSelection(name)}
          >
            Group
          </Button>
          <Button
            label="Release submodel"
            disabled={!editor.selectedBricks.some((b) => b.group)}
            onClick={editor.ungroup}
          >
            Ungroup
          </Button>
        </div>
      </details>
    </div>
  );
}
