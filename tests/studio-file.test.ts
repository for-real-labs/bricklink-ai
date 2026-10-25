// @vitest-environment node
import { describe, expect, it } from "vitest";
import { BlobWriter, TextReader, ZipWriter } from "@zip.js/zip.js";
import { zipSync, strToU8 } from "fflate";
import { readStudioArchive } from "../src/domain/studioFile";
const model = "0 FILE model.ldr\n1 4 0 -24 0 1 0 0 0 1 0 0 0 1 3001.dat\n";
const archive = (files: Record<string, string>) =>
  new Blob([
    new Uint8Array(
      zipSync(
        Object.fromEntries(
          Object.entries(files).map(([name, text]) => [name, strToU8(text)]),
        ),
      ),
    ),
  ]);
describe("native Studio archives", () => {
  it("opens ordinary and Studio-password encrypted model files", async () => {
    const plain = await readStudioArchive(
      archive({ "model.ldr": model }),
      "house.io",
    );
    expect(plain.name).toBe("house");
    expect(plain.bricks[0].partId).toBe("3001");
    const writer = new ZipWriter(new BlobWriter(), {
      password: "soho0909",
      zipCrypto: true,
      useWebWorkers: false,
    });
    await writer.add("model.ldr", new TextReader(model));
    const encrypted = await readStudioArchive(
      await writer.close(),
      "encrypted.io",
    );
    expect(encrypted.bricks[0].ldraw?.transform).toEqual(
      plain.bricks[0].ldraw?.transform,
    );
  });
  it("retains embedded part geometry and expands submodels", async () => {
    const file = archive({
      "model.ldr": "1 4 0 0 0 1 0 0 0 1 0 0 0 1 roof.ldr",
      "roof.ldr": "1 16 0 0 0 1 0 0 0 1 0 0 0 1 custom.dat",
      "CustomParts/parts/custom.dat": "0 Custom part\n3 16 0 0 0 10 0 0 0 10 0",
    });
    const project = await readStudioArchive(file, "custom.io");
    expect(project.bricks[0].group).toContain("roof");
    expect(project.library).toContain("0 FILE custom.dat");
  });
  it("rejects invalid, missing, unsafe, oversized, and corrupt archives", async () => {
    await expect(
      readStudioArchive(new Blob(["bad"]), "bad.io"),
    ).rejects.toThrow("Could not open");
    await expect(
      readStudioArchive(archive({ "notes.txt": "hello" }), "bad.io"),
    ).rejects.toThrow("model.ldr");
    await expect(
      readStudioArchive(
        archive({ "model.ldr": model, "../secret.dat": "0 bad" }),
        "bad.io",
      ),
    ).rejects.toThrow(/unsafe/i);
    await expect(
      readStudioArchive(
        archive({ "model.ldr": model, "bomb.dat": " ".repeat(16_000_001) }),
        "bad.io",
      ),
    ).rejects.toThrow("Expanded");
  });
  it("rejects encrypted data with the wrong key", async () => {
    const writer = new ZipWriter(new BlobWriter(), {
      password: "another-format",
      zipCrypto: true,
      useWebWorkers: false,
    });
    await writer.add("model.ldr", new TextReader(model));
    await expect(
      readStudioArchive(await writer.close(), "wrong.io"),
    ).rejects.toThrow("Could not open");
  });
});
