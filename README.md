# BrickBuilder Studio

An independent, open-source 3D brick editor for the web and desktop. A small, working interpretation of BrickLink Studio's core building workflow, implemented in React, TypeScript, Three.js, and Electron.

**Live app: [studio.brickbuilder.ai](https://studio.brickbuilder.ai)** · Repository: [for-real-labs/bricklink-ai](https://github.com/for-real-labs/bricklink-ai)

![BrickBuilder Studio workspace](docs/workspace.jpg)

## Run it

Use **Node.js 24 LTS** (or Node 22.12+). The starter palette works without an account or API key. Imported part previews use the LDraw library over the network; AI edits and ordering open BrickBuilder.ai.

```sh
npm ci
npm run dev
```

Open the printed local URL. For the desktop app:

```sh
npm run desktop
```

During development, `npm run desktop:dev` starts Vite on port 5174 and opens Electron. `npm run build` produces a static web app in `dist/`; `npm run preview` serves the production build. Upload the contents of `dist/` to any static web host to deploy it.

## Included

- Studio-inspired dark workspace, BrickBuilder wordmark, compact toolbar, and working File/Edit/Model/View/Help menus.
- 26 original procedural parts: bricks, plates, tiles, slopes, and round parts.
- A real, lit 3D scene with shadows; orbit, pan, zoom, fit, and camera presets.
- Search by name, dimensions, or part number; filter by category.
- Click-to-place with repeat placement, stacking, stud-grid snapping, and bounding-box collision checks.
- Single/multiple selection, move, quarter-turn rotation, duplicate, hide/show, delete, and numerical position editing.
- 16 colors, 50 levels of undo/redo, and up to 2,000 parts per project.
- Local autosave, validated JSON project import/export, PNG snapshots, CSV inventories, and LDraw export.
- Build-step assignment and a simple step-through instruction view.
- Responsive drawers on small screens, keyboard shortcuts, and modal focus management.
- Sandboxed Electron wrapper with native application menus and local packaged assets.

The garden pavilion example has 46 pieces and four build steps. Choose **New project → Blank canvas** to start your own model. The question-mark button explains controls. Select a brick and press **M** to pick it up, click to place it, or use the arrow keys and position fields for precision. Y is measured in plate heights; X and Z in studs.

## Files and privacy

Projects use `.brickbuilder.json` (format version 1). Previous JSON project downloads still open, and the previous browser autosave is read automatically on the same origin. Autosaves are scoped to each browser origin and desktop installation; use project files to move between them. The current project saves automatically on this device; download a project file to back it up or move it between the web and desktop apps. Opening a project or starting another replaces this workspace. There is no cloud sync. Imported projects are limited to 16 MB and 2,000 parts and are validated before replacing your model.

Analytics are **disabled by default**. Optional PostHog events use `studio_*` names; they contain control names, part identifiers, counts, and colors, never project names or model files. To enable them for your own deployment, set a public project key via `VITE_POSTHOG_KEY` and optionally `VITE_POSTHOG_HOST` (`https://us.i.posthog.com` or `https://eu.i.posthog.com`). Do not put secret keys in Vite environment variables. Autocapture and session recording are disabled.

## Desktop packages

```sh
npm run desktop:package                    # unpacked app for this platform
npm run desktop:dist -- --mac --arm64       # Apple Silicon .app, DMG, and ZIP
npm run desktop:dist -- --mac --x64         # Intel Mac (build/test separately)
npm run desktop:dist -- --win              # Windows installer
npm run desktop:dist -- --linux            # Linux AppImage
```

Outputs go to `release/`. The Apple Silicon build is locally tested. Windows, Linux, and Intel Mac targets are configured but not verified. Mac packages are **unsigned and not notarized**; distribution to other Macs requires your own Apple signing and notarization setup. The repository does not include signing credentials. `npm run desktop` works directly from a local development checkout.

## Hosting

The app is deployed to the `brickbuilder-studio` Vercel project in `jjohnson3700team`. Cloudflare has a DNS-only `studio` A record pointing to `76.76.21.21`, as recommended by the Vercel CLI. Vercel serves HTTPS at `studio.brickbuilder.ai`.

`vercel.json` defines the Vite build and skips the Electron binary download during cloud installation. `.vercelignore` excludes desktop packages and local artifacts from web uploads. Deploy an approved checkout with `vercel --prod --scope jjohnson3700team`. The initial deployment uses the CLI; automatic Git integration could not connect to the new repository with the existing Vercel installation permissions.

## Checks

```sh
npm test
npm run build
npm run desktop:smoke
npm audit
```

The desktop smoke test launches the actual Electron renderer in an isolated temporary profile, verifies a WebGL canvas, the desktop bridge, rendered model parts, and absence of Node access in the page. It does not touch your saved projects. Run the packaged binary with `--smoke-test` to verify the packaged build too. CI runs unit/component tests, the web build, the Mac smoke test, packaging, and a second smoke test against the packaged app; web and Mac builds are uploaded as workflow artifacts.

## Scope and architecture

This is a basic editor, not the full Studio catalog or a CAD/connectivity solver. Parts have original approximate geometry; collisions use axis-aligned bounding boxes and do not validate physical clutch, stability, legal connections, or support. Hidden parts do not participate in snapping or collisions. Slope geometry, colors, and LDraw output are approximations. LDraw import/export and BrickBuilder AI handoffs are included. Native `.io` import, a hinge/clip/axle connection solver, photorealistic rendering, page-layout instruction editing, and collaboration are not implemented in this editor.

- `src/domain/`: catalog, model validation, geometry constraints, history, inventories, and interchange.
- `src/useEditor.ts`: editor state and commands.
- `src/components/`: accessible editor panels and dialogs.
- `src/scene/`: original procedural meshes and imported LDraw geometry; the viewport owns the rendering lifecycle.
- `electron/`: isolated desktop process and narrow menu and model-transfer bridges.
- `tests/`: domain, geometry, history, and UI behavior tests.

See [research and design notes](docs/research.md) and [verification notes](docs/verification.md).

MIT licensed. BrickLink and LEGO are trademarks of their respective owners. This project is not affiliated with or endorsed by BrickLink or the LEGO Group. No Studio code, artwork, or proprietary part assets are included.

## AI, native Studio, and ordering

Use **Edit with AI** or **Import into BrickBuilder** to send the current model to the landing-page edit stage at brickbuilder.ai. **Order this model** opens `/order` with this model; imported designs first need an AI edit to validate available parts and colors. No order is placed automatically. The BrickBuilder viewer now has **Edit in BrickBuilder Studio** for the return trip.

Open `.ldr` or `.mpd` through **Open project**. Model subassemblies are flattened; part transforms, color IDs, embedded part geometry, and authorship metadata are retained in exports. Imported geometry is rendered with the LDraw library, loaded over the network if not embedded; unavailable geometry gets a labeled placeholder without deleting the source part. Imported models start with collision checks off because the current checks use approximate bounding boxes, not physical connectors. Limits: 2,000 parts, 100 steps, 16 MB, 256 studs / plate heights. Native `.io` files can be imported into BrickBuilder.ai; export `.ldr` from native Studio for this editor.

**Export → BrickLink Studio / LDraw** downloads a native-compatible `.ldr`. **Open in BrickLink** offers the same download and a `brickbuilder-studio://` link through the installed desktop wrapper. The wrapper writes a temporary `.io` container and launches native Studio from its default installation path. On Mac it opens a separate Studio instance, preserving existing windows. Native startup/update prompts may need attention. Large desktop links fall back to file export; web transfers use an origin/window/nonce checked message channel without putting model contents in query strings. Model fragments used by the desktop handoff are cleared before application analytics initialize. No authentication tokens cross between the apps.

The Apple Silicon installer is an unsigned preview. Windows launcher code is included but requires Windows testing; native BrickLink Studio is not available on Linux. See [third-party attributions](docs/third-party.md).
