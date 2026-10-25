# Verification

Verified locally on an Apple Silicon Mac on October 25, 2026.

## Automated checks

- 60 tests passed across domain validation, collision and placement rules, snapping, inventory/LDraw export, undo/redo, procedural geometry bounds for all 26 parts and four rotations, editor interactions, autosave, step navigation, and binary file downloads.
- A clean `npm ci`, TypeScript, and production Vite build passed using Node 24.22.1.
- Peer dependency resolution is explicitly enabled in `.npmrc` so local and CI lockfile behavior match.
- `npm audit --audit-level=moderate`: zero known vulnerabilities.
- Electron source-build smoke test passed.
- Apple Silicon `.app`, `.dmg`, and `.zip` packaging completed.
- Packaged `.app --smoke-test` passed: WebGL canvas present, desktop bridge present, 46 model parts rendered, and `window.require` unavailable.

## Interactive checks

The actual production web build was tested in the Codex in-app browser:

- Create a blank project; choose and place a brick; place another on top (Y = 3 plates).
- Change its color, duplicate it, and pick up/move the duplicate to the ground.
- Download the project, replace the workspace with a blank project, and reopen the saved file; all three parts return.
- Export a PNG, confirm a file downloads, and visually inspect the rendered image.
- Load the 46-part example and step through its instructions.
- Inspect desktop layout and a 390 × 844 CSS-pixel mobile viewport. Page scroll width matches viewport width; parts drawer works and the complete model fits the narrow canvas.
- Confirm no browser console errors after the final renderer update.

The packaged Mac app was opened from `release/mac-arm64/Bricklink AI.app`. It rendered local assets, allowed selection and recoloring, and restored the prior color through the native Command-Z accelerator.

![Web workspace](workspace.jpg)

![Mobile workspace](mobile.jpg)

![Packaged Mac app](desktop.png)

## Verification limits

Mac packages are unsigned and not notarized. Intel Mac, Windows, and Linux builds are configured but have not been tested. LDraw export is covered by transform/unit tests and reference checks, but was not reopened in Studio because Studio's update dialog did not respond to automation. No public web deployment was requested or performed; the web preview runs locally.
