import { useEffect, useState } from "react";
import { Box, ChevronRight, Layers3, Plus, Search, X } from "lucide-react";
import { PARTS, ALL_PARTS, LIBRARY_CATEGORIES } from "../domain/catalog";
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
  const [limit, setLimit] = useState(60);
  useEffect(() => setLimit(60), [query, category, editor.libraryMode]);
  const count = editor.libraryMode ? ALL_PARTS.length : PARTS.length;
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
        <span className="count-badge desktop-only">
          {count.toLocaleString()}
        </span>
      </div>
      <div className="library-source">
        <Layers3 size={15} />
        <select
          aria-label="Parts source"
          value={editor.libraryMode ? "ldraw" : "starter"}
          onChange={(event) => {
            editor.setLibraryMode(event.target.value === "ldraw");
            setCategory("All parts");
            track("parts_source_changed", { source: event.target.value });
          }}
        >
          <option value="ldraw">LDraw library</option>
          <option value="starter">Starter palette · offline</option>
        </select>
        <span>{count.toLocaleString()}</span>
      </div>
      <label className="mobile-category">
        Category
        <select
          aria-label="Part category"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            track("category_selected", { category: event.target.value });
          }}
        >
          {LIBRARY_CATEGORIES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <div className="category-heading">Shapes</div>
      <div className="category-tabs">
        {LIBRARY_CATEGORIES.map((item) => (
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
        {visibleParts.slice(0, limit).map((part) => (
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
      {visibleParts.length > limit && (
        <Button label="Show more parts" onClick={() => setLimit(limit + 60)}>
          Show 60 more · {visibleParts.length - limit} remaining
        </Button>
      )}
      {editor.catalogLoading && (
        <p className="catalog-loading" role="status">
          Loading part geometry…
        </p>
      )}
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
          <small>
            {count.toLocaleString()} parts · geometry loads on selection
          </small>
        </span>
      </div>
    </aside>
  );
}
