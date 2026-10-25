import { Box, ChevronRight, Layers3, Plus, Search, X } from "lucide-react";
import { PARTS, CATEGORIES } from "../domain/catalog";
import { track } from "../analytics";
import { Button } from "./Button";
import { PartPreview } from "./PartPreview";
import type { Editor } from "../useEditor";
export function PartsLibrary({ editor }: { editor: Editor }) {
  const {
    draft,
    color,
    query,
    setQuery,
    category,
    setCategory,
    mobilePanel,
    setMobilePanel,
    visibleParts,
    pickPart,
  } = editor;
  return (
    <aside
      className={`parts-panel ${mobilePanel === "parts" ? "mobile-open" : ""}`}
      aria-label="Parts library"
    >
      <div className="panel-heading">
        <div>
          <h2>Insert</h2>
        </div>
        <Button
          label="Close parts"
          className="mobile-only"
          onClick={() => setMobilePanel(null)}
        >
          <X size={17} />
        </Button>
        <span className="count-badge desktop-only">{PARTS.length}</span>
      </div>
      <div className="library-source">
        <Layers3 size={15} />
        <span>Main parts</span>
        <span>{PARTS.length}</span>
      </div>
      <div className="category-heading">Shapes</div>
      <div className="category-tabs">
        {CATEGORIES.map((item) => (
          <button
            key={item}
            className={category === item ? "selected" : ""}
            onClick={() => {
              setCategory(item);
              track("category_selected", { category: item });
            }}
          >
            <Box size={18} />
            <span>{item}</span>
            <ChevronRight size={12} />
          </button>
        ))}
      </div>
      <label className="search-field">
        <Search size={16} />
        <input
          aria-label="Search parts"
          placeholder="Search parts or number…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            track("parts_searched");
          }}
        />
        <kbd>⌕</kbd>
      </label>
      <div className="library-label">
        <span>
          {category === "All parts" ? "ALL PARTS" : category.toUpperCase()}
        </span>
        <span>{visibleParts.length} parts</span>
      </div>
      <div className="part-grid">
        {visibleParts.map((part) => (
          <button
            key={part.id}
            title={`Place ${part.name}`}
            aria-label={`Place ${part.name}`}
            className={`part-card ${draft?.partId === part.id ? "chosen" : ""}`}
            onClick={() => pickPart(part.id)}
          >
            <span className="part-art">
              <PartPreview
                part={part}
                color={draft?.partId === part.id ? color : undefined}
              />
              <Plus className="part-add" size={13} />
            </span>
            <strong>{part.name}</strong>
            <span>{part.id}</span>
          </button>
        ))}
      </div>
      {!visibleParts.length && (
        <div className="empty-state">
          No parts found.
          <br />
          Try “2x4” or “3001”.
        </div>
      )}
      <div className="library-footer">
        <Box size={16} />
        <span>
          BrickBuilder Studio
          <br />
          <small>26 essential parts</small>
        </span>
      </div>
    </aside>
  );
}
