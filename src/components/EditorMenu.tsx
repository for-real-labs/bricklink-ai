import { useEffect, useRef, useState } from "react";
import { track } from "../analytics";
import type { Editor } from "../useEditor";

type MenuItem = {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  action: () => void;
};

export function EditorMenu({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState<string | null>(null);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    function close(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(null);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const menus: Record<string, MenuItem[]> = {
    File: [
      {
        label: "New model…",
        shortcut: "⌘N",
        action: () => editor.setModal("new"),
      },
      {
        label: "Open model…",
        shortcut: "⌘O",
        action: () => editor.fileInput.current?.click(),
      },
      { label: "Save model", shortcut: "⌘S", action: editor.save },
      { label: "Export…", action: () => editor.setModal("export") },
    ],
    Edit: [
      {
        label: "Copy",
        shortcut: "⌘C",
        disabled: !editor.first,
        action: () => editor.copy(),
      },
      {
        label: "Cut",
        shortcut: "⌘X",
        disabled: !editor.first,
        action: () => editor.copy(true),
      },
      {
        label: "Paste",
        shortcut: "⌘V",
        disabled: !editor.clipboard.length,
        action: () => editor.paste(),
      },
      {
        label: "Undo",
        shortcut: "⌘Z",
        disabled: !editor.history.past.length,
        action: editor.undo,
      },
      {
        label: "Redo",
        shortcut: "⇧⌘Z",
        disabled: !editor.history.future.length,
        action: editor.redo,
      },
      {
        label: "Clone selection",
        shortcut: "⌘D",
        disabled: !editor.first,
        action: editor.duplicate,
      },
      {
        label: "Delete selection",
        shortcut: "⌫",
        disabled: !editor.first,
        action: editor.remove,
      },
    ],
    Model: [
      { label: "Check model…", action: () => editor.setModal("check") },
      {
        label: "Select same part type",
        disabled: !editor.first,
        action: () => editor.selectMatching("type"),
      },
      {
        label: "Select same color",
        disabled: !editor.first,
        action: () => editor.selectMatching("color"),
      },
      {
        label: "Isolate selection",
        disabled: !editor.first,
        action: () => editor.visibility("isolate"),
      },
      {
        label: "Select all parts",
        action: () =>
          editor.setSelected(
            editor.project.bricks
              .filter((brick) => !brick.hidden && brick.step <= editor.step)
              .map((brick) => brick.id),
          ),
      },
      {
        label: "Show all parts",
        action: () => editor.visibility("show"),
      },
      { label: "Parts list…", action: () => editor.setModal("inventory") },
    ],
    View: [
      {
        label: "Fit model",
        shortcut: "F",
        action: () => editor.viewport.current?.frame(),
      },
      {
        label: "Isometric",
        action: () => editor.viewport.current?.view("perspective"),
      },
      { label: "Front", action: () => editor.viewport.current?.view("front") },
      { label: "Top", action: () => editor.viewport.current?.view("top") },
      {
        label: editor.grid ? "Hide grid" : "Show grid",
        action: () => editor.setGrid(!editor.grid),
      },
    ],
    Help: [
      {
        label: "BrickBuilder Studio help",
        action: () => editor.setModal("help"),
      },
    ],
  };
  return (
    <nav
      className="editor-menu"
      aria-label="Application menu"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(null);
          root.current
            ?.querySelector<HTMLButtonElement>(`[data-menu="${open}"]`)
            ?.focus();
        }
      }}
    >
      {Object.entries(menus).map(([name, items]) => (
        <div className="menu-group" key={name}>
          <button
            data-menu={name}
            aria-expanded={open === name}
            aria-controls={`menu-${name}`}
            onClick={() => {
              setOpen(open === name ? null : name);
              track("menu_opened", { menu: name });
            }}
          >
            {name}
          </button>
          {open === name && (
            <div
              id={`menu-${name}`}
              className="menu-dropdown"
              aria-label={`${name} actions`}
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(null);
                    item.action();
                    track("menu_action", { action: item.label });
                  }}
                >
                  <span>{item.label}</span>
                  <kbd>{item.shortcut}</kbd>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
