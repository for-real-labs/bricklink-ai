import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
// These scenarios exercise several user interactions across the full editor DOM.
vi.setConfig({ testTimeout: 15000 });
import { forwardRef, useImperativeHandle } from "react";
import type { Brick } from "../src/domain/model";
import { createBrick, emptyProject } from "../src/domain/model";
vi.mock("../src/analytics", () => ({ track: vi.fn() }));
vi.mock("../src/components/Viewport", () => ({
  Viewport: forwardRef(function FakeViewport(
    {
      draft,
      onPlace,
    }: { draft: Brick | null; onPlace: (brick: Brick) => void },
    ref,
  ) {
    useImperativeHandle(ref, () => ({
      frame: vi.fn(),
      view: vi.fn(),
      zoom: vi.fn(),
    }));
    return (
      <button
        aria-label="Place in workspace"
        onClick={() => draft && onPlace({ ...draft, x: 10, z: 10 })}
      >
        Workspace
      </button>
    );
  }),
}));
import App from "../src/App";
import { parseLDraw } from "../src/domain/ldraw";
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    "brickbuilder-studio.project.v1",
    JSON.stringify(emptyProject()),
  );
});
describe("editor interactions", () => {
  it("keeps approximate collision disabled when restoring an imported model", () => {
    localStorage.setItem(
      "brickbuilder-studio.project.v1",
      JSON.stringify(parseLDraw("1 4 0 0 0 1 0 0 0 1 0 0 0 1 3001.dat")),
    );
    render(<App />);
    expect(
      screen.getByRole("button", { name: "Collision detection" }),
    ).not.toHaveClass("active");
  });
  it("searches, places, recolors, undoes, and restores from autosave", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.type(screen.getByLabelText("Search parts"), "3001");
    expect(
      screen.getAllByRole("button", { name: "Place Brick 2 × 4" }),
    ).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Place Brick 2 × 4" }));
    await user.click(
      screen.getByRole("button", { name: "Place in workspace" }),
    );
    await user.click(screen.getByRole("button", { name: "Cancel placement" }));
    await user.click(screen.getByRole("button", { name: "Color Blue" }));
    expect(
      JSON.parse(localStorage.getItem("brickbuilder-studio.project.v1")!)
        .bricks[0].color,
    ).toBe("#4c78ba");
    await user.click(screen.getByRole("button", { name: "Undo (⌘Z)" }));
    expect(
      JSON.parse(localStorage.getItem("brickbuilder-studio.project.v1")!)
        .bricks[0].color,
    ).toBe("#c85c42");
    unmount();
    render(<App />);
    expect(
      screen.getByRole("button", { name: "Select Brick 2 × 4 1" }),
    ).toBeInTheDocument();
  });
  it("duplicates, moves, rotates, and deletes selected bricks", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Place Brick 2 × 4" }));
    await user.click(
      screen.getByRole("button", { name: "Place in workspace" }),
    );
    await user.click(screen.getByRole("button", { name: "Cancel placement" }));
    await user.click(screen.getByRole("button", { name: "Duplicate (⌘D)" }));
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "r" });
    let project = JSON.parse(
      localStorage.getItem("brickbuilder-studio.project.v1")!,
    );
    expect(project.bricks).toHaveLength(2);
    expect(project.bricks[1].x).toBe(16);
    expect(project.bricks[1].rotation).toBe(1);
    await user.click(screen.getByRole("button", { name: "Delete selection" }));
    project = JSON.parse(
      localStorage.getItem("brickbuilder-studio.project.v1")!,
    );
    expect(project.bricks).toHaveLength(1);
  });
  it("creates and navigates build steps", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Build steps" }));
    await user.click(screen.getByRole("button", { name: "Add build step" }));
    expect(screen.getByText("Step 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Instructions mode" }));
    expect(
      screen.getByRole("button", { name: "Previous step" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getByRole("button", { name: "Next step" })).toBeDisabled();
  });
  it("requires a deliberate choice before clearing the workspace", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "New project" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Load example project" }),
    );
    expect(
      screen.getAllByRole("button", { name: /^Select / }).length,
    ).toBeGreaterThan(20);
  });
  it("keeps keyboard editing out of input fields", async () => {
    const user = userEvent.setup();
    render(<App />);
    const search = screen.getByLabelText("Search parts");
    await user.type(search, "3001");
    fireEvent.keyDown(search, { key: "Backspace" });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("shows all four functional export choices", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Export project" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Project file")).toBeInTheDocument();
    expect(within(dialog).getByText("Image")).toBeInTheDocument();
    expect(within(dialog).getByText("Parts list")).toBeInTheDocument();
    expect(
      within(dialog).getByText("BrickLink Studio / LDraw"),
    ).toBeInTheDocument();
  });
  it("opens the mobile controls", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      screen.getByRole("button", { name: "Show parts library" }),
    );
    expect(
      screen.getByRole("complementary", { name: "Parts library" }),
    ).toHaveClass("mobile-open");
  });
});

describe("Studio menus and project compatibility", () => {
  it("preserves an existing autosave when moving to the Studio storage key", () => {
    localStorage.clear();
    const project = {
      ...emptyProject(),
      name: "Existing build",
      bricks: [createBrick("3001", "#c85c42")],
    };
    localStorage.setItem("bricklink-ai.project.v1", JSON.stringify(project));
    render(<App />);
    expect(screen.getByLabelText("Project name")).toHaveValue("Existing build");
    expect(
      JSON.parse(localStorage.getItem("brickbuilder-studio.project.v1")!),
    ).toEqual(project);
  });
  it("runs menu commands, shows hidden parts, and closes menus with Escape", async () => {
    const user = userEvent.setup();
    const project = {
      ...emptyProject(),
      bricks: [{ ...createBrick("3001", "#c85c42"), hidden: true }],
    };
    localStorage.setItem(
      "brickbuilder-studio.project.v1",
      JSON.stringify(project),
    );
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Model" }));
    await user.click(screen.getByRole("button", { name: "Show all parts" }));
    expect(
      JSON.parse(localStorage.getItem("brickbuilder-studio.project.v1")!)
        .bricks[0].hidden,
    ).toBe(false);
    expect(
      screen.queryByRole("button", { name: "Show all parts" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "File" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "File" })).toHaveFocus();
    expect(
      screen.queryByRole("button", { name: "New model…" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Help" }));
    await user.click(
      screen.getByRole("button", { name: "BrickBuilder Studio help" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Getting started" }),
    ).toBeInTheDocument();
  });
});

describe("core Studio workflow controls", () => {
  function savedProject() {
    return JSON.parse(localStorage.getItem("brickbuilder-studio.project.v1")!);
  }
  function loadBricks() {
    const a = createBrick("3001", "#c85c42");
    const b = { ...createBrick("3001", "#c85c42"), x: 8 };
    localStorage.setItem(
      "brickbuilder-studio.project.v1",
      JSON.stringify({ ...emptyProject(), bricks: [a, b] }),
    );
    return [a, b];
  }
  it("copies, cuts, pastes, and undoes through familiar shortcuts without losing the clipboard", () => {
    loadBricks();
    render(<App />);
    fireEvent.keyDown(window, { key: "a", ctrlKey: true });
    fireEvent.keyDown(window, { key: "x", ctrlKey: true });
    expect(savedProject().bricks).toHaveLength(0);
    fireEvent.keyDown(window, { key: "v", ctrlKey: true });
    expect(savedProject().bricks).toHaveLength(2);
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(savedProject().bricks).toHaveLength(0);
    fireEvent.keyDown(window, { key: "v", ctrlKey: true });
    expect(savedProject().bricks).toHaveLength(2);
  });
  it("groups, rotates on a chosen axis, isolates, and restores visible parts", async () => {
    const user = userEvent.setup();
    loadBricks();
    render(<App />);
    await user.click(
      screen.getByRole("button", { name: "Select Brick 2 × 4 1" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Select same part type" }),
    );
    await user.click(screen.getByText("Rotate & submodels"));
    await user.clear(screen.getByLabelText("Submodel name"));
    await user.type(screen.getByLabelText("Submodel name"), "Roof");
    await user.click(screen.getByRole("button", { name: "Create submodel" }));
    expect(savedProject().bricks.every((b: Brick) => b.group === "Roof")).toBe(
      true,
    );
    await user.selectOptions(screen.getByLabelText("Rotation axis"), "z");
    await user.click(
      screen.getByRole("button", { name: "Apply precise rotation" }),
    );
    expect(savedProject().bricks.every((b: Brick) => b.ldraw)).toBe(true);
    await user.click(screen.getByRole("button", { name: "Release submodel" }));
    expect(savedProject().bricks.every((b: Brick) => !b.group)).toBe(true);
    await user.click(
      screen.getByRole("button", { name: "Select Brick 2 × 4 1" }),
    );
    await user.click(screen.getByRole("button", { name: "Isolate selection" }));
    expect(savedProject().bricks.filter((b: Brick) => b.hidden)).toHaveLength(
      1,
    );
    await user.click(screen.getByRole("button", { name: "Model" }));
    await user.click(screen.getByRole("button", { name: "Show all parts" }));
    expect(savedProject().bricks.every((b: Brick) => !b.hidden)).toBe(true);
  });
  it("moves an assembly together with half-stud nudges and mouse placement", async () => {
    const user = userEvent.setup();
    loadBricks();
    render(<App />);
    fireEvent.keyDown(window, { key: "a", ctrlKey: true });
    await user.selectOptions(screen.getByLabelText("Grid increment"), "0.5");
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(savedProject().bricks.map((b: Brick) => b.x)).toEqual([0.5, 8.5]);
    await user.click(screen.getByRole("button", { name: "Move selected (M)" }));
    await user.click(
      screen.getByRole("button", { name: "Place in workspace" }),
    );
    expect(savedProject().bricks.map((b: Brick) => b.x)).toEqual([10, 18]);
  });
  it("reorders and deletes steps while retaining all parts, then inspects overlaps", async () => {
    const user = userEvent.setup();
    loadBricks();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Build steps" }));
    await user.click(screen.getByRole("button", { name: "Add build step" }));
    await user.click(screen.getByRole("button", { name: "Move step earlier" }));
    expect(savedProject().bricks.map((b: Brick) => b.step)).toEqual([2, 2]);
    await user.click(
      screen.getByRole("button", { name: "Delete current step" }),
    );
    expect(savedProject().steps).toBe(1);
    expect(savedProject().bricks).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Check model" }));
    expect(
      screen.getByText("No bounding-box overlaps found."),
    ).toBeInTheDocument();
  });
});
it("keeps clipboard and category controls available in the mobile inspector", async () => {
  const user = userEvent.setup();
  localStorage.setItem(
    "brickbuilder-studio.project.v1",
    JSON.stringify({
      ...emptyProject(),
      bricks: [createBrick("3001", "#c85c42")],
    }),
  );
  render(<App />);
  await user.selectOptions(screen.getByLabelText("Part category"), "Technic");
  expect(
    screen.getByRole("button", { name: "Place Technic Brick 1 x 2 with Hole" }),
  ).toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Select Brick 2 × 4 1" }),
  );
  await user.click(screen.getByRole("button", { name: "Cut selected parts" }));
  expect(
    screen.getByRole("button", { name: "Paste copied parts" }),
  ).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "Paste copied parts" }));
  expect(
    JSON.parse(localStorage.getItem("brickbuilder-studio.project.v1")!).bricks,
  ).toHaveLength(1);
});
