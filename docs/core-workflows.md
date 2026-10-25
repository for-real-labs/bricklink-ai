# Ten first-use Studio workflows

These priorities are an engineering judgment based on Studio's documented building workflow, not a survey-based ranking. Implemented in BrickBuilder Studio 0.3.

| User check | Controls and acceptance behavior |
| --- | --- |
| 1. Open an existing model | Open project or drop `.io`, `.ldr`, `.mpd`, or JSON. Standard Studio password-protected containers are read locally, with archive-entry and expanded-size limits. Preserve colors, matrices, steps, and embedded geometry. |
| 2. Find familiar parts | Search 14,623 entries by name/number; choose categories or the offline starter palette. Render lazy thumbnails and actual LDraw geometry. |
| 3. Select efficiently | Box tool selects projected part centers, including occluded parts. Shift/Ctrl/Command adds selection. Same part/color actions respect hidden parts and the current step. Alt-click a model row to select within a group. |
| 4. Copy, cut, paste, duplicate | Edit menu, familiar shortcuts, or inspector controls. Copies get unique IDs and independent group names; paste places them nearby in the current build step. Undo restores the previous model. |
| 5. Move assemblies accurately | Move carries the complete selection. Position fields and arrow keys move all selected parts; whole/half/quarter-stud increments; Shift-arrow moves ten increments. |
| 6. Rotate precisely | Inspector → Rotate & submodels → X, Y, or Z and an angle. Parts rotate around one shared center in physical LDraw units. Export/reimport retains the resulting matrix. This is a manual pivot operation, not connector-aware hinging. |
| 7. Organize submodels | Name and group a selection; clicking a member selects the visible group. Ungroup releases it. MPD export writes independent named assembly sections; ordinary LDraw stays flat. Imported nested models become first-level groups. |
| 8. Reveal internal work | Hide, isolate, and Show all parts are undoable. The inspector exposes restore controls on small screens too. |
| 9. Edit build steps | Move steps earlier/later or delete one. Deleting a step moves its parts to the adjacent step; no parts are deleted. Instructions and export follow the resulting order. |
| 10. Review before export | Check model lists up to 100 possible bounding-box overlaps; choose a result to inspect that pair. Rotated bounds are supported. Hidden parts are excluded. |

## Verification

Automated tests cover encrypted `.io`, malformed archives and size limits, exact transform round trips, assembly distance preservation, clipboard IDs/groups, catalog search, step operations, MPD export/reimport, bounded collision reports, projected box selection, lazy thumbnails, and UI commands.

Browser acceptance opened an encrypted Studio fixture, loaded/placed Technic part 3700, box-selected its submodel, rotated it 45°, copied/pasted, isolated/restored parts, edited steps, and inspected overlaps. Small-screen checks use actual CSS widths of 320 and 390 pixels. The 320px catalog uses a compact category selector so the part grid stays visible.

Overlap detection uses conservative boxes and can flag valid angled, hollow, and interlocking parts. It does not prove physical connections, stability, or available colors. Catalog lookup and previews need a network connection. Model limits remain 16 MB, 2,000 parts, 100 steps, and ±256 workspace coordinates. The native deep-link verification limitation from 0.2 remains documented in verification.md.

## Primary references

- [Import formats](https://studiohelp.bricklink.com/hc/en-us/articles/6502277722647-Import-formats)
- [Adding parts](https://studiohelp.bricklink.com/hc/en-us/articles/5410055533207-Adding-parts-to-a-design)
- [Selection Tool](https://studiohelp.bricklink.com/hc/en-us/articles/5410231515543-Selection-Tool)
- [Clone, copy, and paste](https://studiohelp.bricklink.com/hc/en-us/articles/5412307707031-Clone)
- [Submodels](https://studiohelp.bricklink.com/hc/en-us/articles/5625432131863-Submodel)
- [Managing steps](https://studiohelp.bricklink.com/hc/en-us/articles/7332196059799-Managing-steps)
- [Collision](https://studiohelp.bricklink.com/hc/en-us/articles/5412820155927-Collision)
- [Pinned LDraw source](https://github.com/pybricks/ldraw/tree/c43ed06a128a10ed65675166bf42eb6fd608b9b0)
- [zip.js documentation](https://gildas-lormeau.github.io/zip.js/)
