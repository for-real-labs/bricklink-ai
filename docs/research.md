# Studio reference and design decisions

Reviewed October 25, 2026. BrickLink Studio was opened on the development Mac. It displayed an update prompt for Studio 2.26.9_1; the native app did not respond to automated dismissal. No update or preference change was made. The working interaction reference came from the official documentation below.

| Official reference | Implemented interpretation |
| --- | --- |
| [Studio overview and tools](https://www.bricklink.com/v2/build/studiohelp.page) | Parts palette, viewport, color palette, selection, clone, hide, and build steps. |
| [Adding parts](https://studiohelp.bricklink.com/hc/en-us/articles/5410055533207-Adding-parts-to-a-design) | Pick in palette, click to place, repeat placement, rotate, Escape to cancel, Delete to remove. |
| [Snap](https://studiohelp.bricklink.com/hc/en-us/articles/5412087360919-Snap) | Stud-grid ground alignment and placement on a brick's top. This does not reproduce Studio's connector-aware solver. |
| [Collision](https://studiohelp.bricklink.com/hc/en-us/articles/5412820155927-Collision) | Toggleable overlap rejection with a red invalid-placement preview; conservative bounding boxes. |
| [Grid](https://studiohelp.bricklink.com/hc/en-us/articles/5411879028375-Grid) | Stud units horizontally, plate heights vertically, and quarter-stud positioning when snap is off. |
| [Studio tools](https://studiohelp.bricklink.com/hc/en-us/sections/5410248438039-Tools) | A focused subset; advanced tools explicitly excluded from the first release. |

The UI uses a light, warm workspace, compact toolbars, parts on the left, colors and model hierarchy on the right, and a central interactive scene. All meshes and palette thumbnails are generated from original code. Native part numbers identify the approximate shapes; no Studio/LDraw mesh library is bundled.

LDraw export follows the [LDraw file format](https://www.ldraw.org/article/218.html). Core brick dimensions and slope origin conventions were checked against the official [3001](https://library.ldraw.org/library/official/parts/3001.dat) and [3039](https://library.ldraw.org/library/official/parts/3039.dat) part definitions. Slopes use an offset origin and a reversed facing relative to our procedural meshes. CSV and project JSON preserve the editor's exact colors; LDraw maps the curated palette to approximate catalog colors.

The Electron wrapper follows the [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security): sandbox, context isolation, no renderer Node integration, local packaged content, a content security policy, denied permissions and new windows, and blocked navigation. The preload bridge only receives an allowlisted set of menu commands; it exposes no filesystem or shell access.
