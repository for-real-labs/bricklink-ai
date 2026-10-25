import { useMemo } from "react";
import { checkModel } from "../domain/workflows";
import { Button } from "./Button";
import type { Editor } from "../useEditor";
export function ModelCheck({ editor }: { editor: Editor }) {
  const report = useMemo(() => checkModel(editor.project), [editor.project]);
  return (
    <>
      <span className="eyebrow">BUILD REVIEW</span>
      <h1>Check model</h1>
      <p>
        {report.issues.length}
        {report.truncated ? "+" : ""} possible overlaps among visible parts.
      </p>
      <p className="fine-print">
        This checks bounding boxes, including rotated parts. Slopes, hollow
        parts, and imported geometry can produce false positives. Hidden parts
        are skipped. This does not test connections, structural stability, or
        real-world color availability.
      </p>
      {report.approximateParts > 0 && (
        <p className="fine-print">
          {report.approximateParts} LDraw parts use conservative bounds. Review
          their fit in the 3D view or native Studio.
        </p>
      )}
      <div className="model-issues">
        {report.issues.map((issue, index) => (
          <Button
            key={index}
            label={`Inspect overlap ${index + 1}`}
            onClick={() => {
              editor.changeStep(editor.project.steps);
              editor.setSelected(issue.ids);
              editor.setDraft(null);
              editor.setModal(null);
            }}
          >
            <span>
              {index + 1}. {issue.message}
            </span>
            <small>Select pair →</small>
          </Button>
        ))}
      </div>
      {!report.issues.length && (
        <div className="check-success">No bounding-box overlaps found.</div>
      )}
    </>
  );
}
