# Studio reference and design decisions

Reviewed October 25, 2026. BrickLink Studio was opened on the development Mac. After its update prompt was dismissed, Command-N opened an empty model for direct visual inspection. The dark build interface informed the charcoal chrome, compact icon-and-label toolbar, document strip, category tree and part grid on the left, and color/step panels on the right. Arial/Helvetica/system fonts approximate the native typography; no proprietary fonts or assets are bundled. The BrickBuilder wordmark follows the existing website’s uppercase, heavy system font with red BRICK and light BUILDER, plus a lighter gray studio label.

[Build mode interface reference](https://studiohelp.bricklink.com/hc/en-us/articles/5406574588823-Build-mode-interface).

| Official reference | Implemented interpretation |
| --- | --- |
| [Studio overview and tools](https://www.bricklink.com/v2/build/studiohelp.page) | Parts palette, viewport, color palette, selection, clone, hide, and build steps. |
| [Adding parts](https://studiohelp.bricklink.com/hc/en-us/articles/5410055533207-Adding-parts-to-a-design) | Pick in palette, click to place, repeat placement, rotate, Escape to cancel, Delete to remove. |
| [Snap](https://studiohelp.bricklink.com/hc/en-us/articles/5412087360919-Snap) | Stud-grid ground alignment and placement on a brick's top. This does not reproduce Studio's connector-aware solver. |
| [Collision](https://studiohelp.bricklink.com/hc/en-us/articles/5412820155927-Collision) | Toggleable overlap rejection with a red invalid-placement preview; conservative bounding boxes. |
| [Grid](https://studiohelp.bricklink.com/hc/en-us/articles/5411879028375-Grid) | Stud units horizontally, plate heights vertically, and quarter-stud positioning when snap is off. |
| [Studio tools](https://studiohelp.bricklink.com/hc/en-us/sections/5410248438039-Tools) | A focused subset; advanced tools explicitly excluded from the first release. |

The UI uses a dark charcoal workspace, compact toolbars, parts on the left, colors and model hierarchy on the right, and a central interactive scene. The starter meshes and palette thumbnails are generated from original code. Imported parts now use the licensed LDraw library through a pinned mirror; see [third-party attribution](third-party.md).

LDraw export follows the [LDraw file format](https://www.ldraw.org/article/218.html). Core brick dimensions and slope origin conventions were checked against the official [3001](https://library.ldraw.org/library/official/parts/3001.dat) and [3039](https://library.ldraw.org/library/official/parts/3039.dat) part definitions. Slopes use an offset origin and a reversed facing relative to our procedural meshes. CSV and project JSON preserve the editor's exact colors; LDraw maps the curated palette to approximate catalog colors.

The Electron wrapper follows the [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security): sandbox, context isolation, no renderer Node integration, local packaged content, a content security policy, denied permissions and new windows, and blocked navigation. The preload bridge receives allowlisted menu commands and exposes two validated handoffs: native Studio and BrickBuilder.ai. It exposes no general filesystem or shell access.

## Round-trip integration

Official [import formats](https://studiohelp.bricklink.com/hc/en-us/articles/6502277722647-Import-formats) and [export formats](https://studiohelp.bricklink.com/hc/en-us/articles/6502197862679-Exporting-to-other-formats) document LDraw exchange with native Studio. The installed Mac app registers no browser URL scheme, so the web button uses our `brickbuilder-studio://` Electron bridge with a file-export fallback. Native Studio startup prompts remain outside the bridge’s control.
