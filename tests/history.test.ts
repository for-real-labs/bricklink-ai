import { describe, expect, it } from "vitest";
import { historyReducer, type History } from "../src/domain/history";
import { emptyProject } from "../src/domain/model";
const start = (): History => ({
  past: [],
  present: emptyProject(),
  future: [],
});
describe("undo / redo", () => {
  it("restores full state and clears future after a new edit", () => {
    const a = start();
    const b = historyReducer(a, {
      type: "commit",
      project: { ...a.present, name: "Changed" },
    });
    const c = historyReducer(b, { type: "undo" });
    expect(c.present.name).toBe("Untitled build");
    expect(historyReducer(c, { type: "redo" }).present.name).toBe("Changed");
    expect(
      historyReducer(c, {
        type: "commit",
        project: { ...c.present, name: "Other" },
      }).future,
    ).toEqual([]);
  });
  it("ignores no-op edits and empty undo", () => {
    const a = start();
    expect(historyReducer(a, { type: "undo" })).toBe(a);
    expect(historyReducer(a, { type: "commit", project: a.present })).toBe(a);
  });
  it("bounds memory and clears history for imported projects", () => {
    let state = start();
    for (let i = 0; i < 80; i++)
      state = historyReducer(state, {
        type: "commit",
        project: { ...state.present, name: String(i) },
      });
    expect(state.past).toHaveLength(50);
    expect(
      historyReducer(state, { type: "reset", project: emptyProject() }).past,
    ).toEqual([]);
  });
});
