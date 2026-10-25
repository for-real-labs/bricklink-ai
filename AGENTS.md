# BrickBuilder Studio working agreements

- Never push directly to or merge into `main` or another production branch without an explicit request for that specific branch or pull request in the current conversation. Push a feature branch and leave its pull request open.
- Use Node.js 24 LTS and `npm ci`.
- Keep the pure model/domain layer separate from rendering, editor commands, and UI panels.
- Add meaningful unit or component tests under `tests/` for code changes. Run `npm test` and `npm run build`; desktop changes also require `npm run desktop:smoke` and a packaged-app smoke test when the platform is available.
- Validate imported project data. Preserve Electron sandboxing, context isolation, navigation restrictions, and the narrow preload bridge.
- Never commit credentials or local environment files. Telemetry remains disabled unless a public PostHog project key is explicitly configured.
- Verify desktop and small-screen layouts after UI changes. Document limitations honestly.
- Do not copy proprietary Studio code or assets. Keep part geometry original unless a separately licensed library is deliberately integrated with appropriate attribution.
