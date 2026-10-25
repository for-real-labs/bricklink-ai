// @vitest-environment node
import { createRequire } from "node:module";
import { rm, readFile } from "node:fs/promises";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import { gzipSync } from "node:zlib";
import { describe, it, expect, vi } from "vitest";
const { parseDeepLink, validateBuilderUrl, launchStudio } = createRequire(
  import.meta.url,
)("../electron/integrations.cjs");
const model = {
  name: "Example;$(evil)",
  content: "1 4 0 0 0 1 0 0 0 1 0 0 0 1 3001.dat",
};
const link =
  "brickbuilder-studio://open-in-bricklink#model=" +
  gzipSync(JSON.stringify(model)).toString("base64url");
describe("desktop integrations", () => {
  it("accepts only bounded model protocol links", () => {
    expect(parseDeepLink(link)).toEqual(model);
    expect(() =>
      parseDeepLink(link.replace("open-in-bricklink", "execute")),
    ).toThrow();
    expect(() => parseDeepLink("file:///etc/passwd")).toThrow();
  });
  it.each([
    "https://brickbuilder.ai.evil.test/#model=x",
    "file:///etc/passwd",
    "https://brickbuilder.ai/admin#model=x",
    "https://evil@brickbuilder.ai/#model=x",
  ])("rejects unsafe external destination %s", (url) =>
    expect(() => validateBuilderUrl(url)).toThrow(),
  );
  it("passes the model as an isolated document path to a fixed application without shell interpretation", async () => {
    const execute = vi.fn().mockResolvedValue({});
    const filename = await launchStudio(model, { platform: "darwin", execute });
    expect(execute).toHaveBeenCalledWith("/usr/bin/open", [
      "-n",
      "-a",
      "/Applications/Studio 2.0/Studio.app",
      "--args",
      filename,
    ]);
    expect(strFromU8(unzipSync(await readFile(filename))["model.ldr"])).toBe(
      model.content,
    );
    expect(path.basename(filename)).not.toMatch(/[;$()]/);
    await rm(path.dirname(filename), { recursive: true });
  });
});
