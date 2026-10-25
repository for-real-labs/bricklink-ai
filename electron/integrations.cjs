const path = require("node:path");
const fs = require("node:fs/promises");
const os = require("node:os");
const { execFile, spawn } = require("node:child_process");
const { promisify } = require("node:util");
const zlib = require("node:zlib");
const { zipSync, strToU8 } = require("fflate");
const exec = promisify(execFile);
function validateModel(model) {
  if (
    !model ||
    typeof model.name !== "string" ||
    !model.name.trim() ||
    model.name.length > 120 ||
    typeof model.content !== "string" ||
    model.content.length > 16_000_000 ||
    !/^1\s/m.test(model.content)
  )
    throw new Error("Invalid LDraw model.");
  return model;
}
function parseDeepLink(value) {
  if (typeof value !== "string" || value.length > 25000)
    throw new Error("Invalid desktop link.");
  const url = new URL(value);
  if (
    url.protocol !== "brickbuilder-studio:" ||
    url.hostname !== "open-in-bricklink" ||
    url.pathname ||
    url.search ||
    url.username ||
    url.password
  )
    throw new Error("Unsupported desktop action.");
  const token = new URLSearchParams(url.hash.slice(1)).get("model");
  if (!token || !/^[a-zA-Z0-9_-]{1,24000}$/.test(token))
    throw new Error("Invalid desktop model.");
  return validateModel(
    JSON.parse(
      zlib
        .gunzipSync(Buffer.from(token, "base64url"), {
          maxOutputLength: 16_001_000,
        })
        .toString("utf8"),
    ),
  );
}
function validateBuilderUrl(value) {
  if (typeof value !== "string" || value.length > 25000)
    throw new Error("Invalid BrickBuilder link.");
  const url = new URL(value);
  if (
    url.origin !== "https://brickbuilder.ai" ||
    !["/", "/order"].includes(url.pathname) ||
    url.username ||
    url.password ||
    url.search ||
    !url.hash.startsWith("#model=")
  )
    throw new Error("Unsupported destination.");
  return url.href;
}
async function launchStudio(model, options = {}) {
  validateModel(model);
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "brickbuilder-studio-export-"),
  );
  const filename = path.join(
    directory,
    (model.name.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "model") +
      ".io",
  );
  await fs.writeFile(
    filename,
    Buffer.from(zipSync({ "model.ldr": strToU8(model.content) })),
    {
      encoding: "utf8",
      mode: 0o600,
    },
  );
  const platform = options.platform || process.platform;
  const execute = options.execute || exec;
  if (platform === "darwin") {
    // A fixed Studio executable receives only the generated document path; no shell is involved.
    await execute("/usr/bin/open", [
      "-n",
      "-a",
      "/Applications/Studio 2.0/Studio.app",
      "--args",
      filename,
    ]);
  } else if (platform === "win32") {
    const candidates = [
      path.join(
        process.env.ProgramFiles || "C:\\Program Files",
        "Studio 2.0",
        "Studio.exe",
      ),
      path.join(
        process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
        "Studio 2.0",
        "Studio.exe",
      ),
    ];
    let executable;
    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        executable = candidate;
        break;
      } catch {}
    }
    if (!executable)
      throw new Error(
        "Install native BrickLink Studio in its default location, or download the .ldr file and open it manually.",
      );
    await new Promise((resolve, reject) => {
      const child = spawn(executable, [filename], {
        detached: true,
        stdio: "ignore",
        shell: false,
      });
      child.once("error", reject);
      child.once("spawn", () => {
        child.unref();
        resolve();
      });
    });
  } else
    throw new Error(
      "Native BrickLink Studio is supported on macOS and Windows. Download the .ldr file for your LDraw application.",
    );
  return filename;
}
module.exports = {
  validateModel,
  parseDeepLink,
  validateBuilderUrl,
  launchStudio,
};
