import { BlobReader, ZipReader } from "@zip.js/zip.js";
import { MAX_FILE_SIZE, parseProject, type Project } from "./model";
import { parseLDraw } from "./ldraw";

const STUDIO_FORMAT_PASSWORD = "soho0909"; // Public container-format key, not a user credential.
function safeName(name: string) {
  const normalized = name.replaceAll("\\", "/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.split("/").includes("..") ||
    /[:\x00-\x1f]/.test(normalized)
  )
    throw new Error("The Studio archive contains an unsafe filename.");
  return normalized;
}
/** Read only bounded model text; never extract paths to the user's filesystem. */
export async function readStudioArchive(
  file: Blob,
  name: string,
): Promise<Project> {
  if (file.size > MAX_FILE_SIZE)
    throw new Error("Choose a model smaller than 16 MB.");
  const reader = new ZipReader(new BlobReader(file), {
    password: STUDIO_FORMAT_PASSWORD,
    useWebWorkers: false,
    checkSignature: true,
  });
  try {
    const entries = [],
      names = new Set<string>();
    let total = 0;
    for await (const entry of reader.getEntriesGenerator()) {
      const key = safeName(entry.filename).toLowerCase();
      if (names.has(key))
        throw new Error("The Studio archive contains duplicate files.");
      names.add(key);
      total += entry.uncompressedSize;
      if (entries.length >= 2000 || total > MAX_FILE_SIZE)
        throw new Error(
          "Expanded Studio archive exceeds the 16 MB / 2,000 file limit.",
        );
      entries.push(entry);
    }
    const main = entries.find(
      (entry) => entry.filename.toLowerCase() === "model.ldr",
    );
    if (!main) throw new Error("This Studio file does not contain model.ldr.");
    let expanded = 0;
    async function read(entry: typeof main & {}) {
      if (entry.directory)
        throw new Error("Expected a model file, not a directory.");
      const chunks: Uint8Array[] = [];
      await entry.getData!(
        new WritableStream<Uint8Array>({
          write(chunk) {
            expanded += chunk.length;
            if (expanded > MAX_FILE_SIZE)
              throw new Error("Expanded Studio archive exceeds 16 MB.");
            chunks.push(chunk);
          },
        }),
      );
      const bytes = new Uint8Array(
        chunks.reduce((sum, chunk) => sum + chunk.length, 0),
      );
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      return new TextDecoder().decode(bytes);
    }
    let text = await read(main);
    if (!/^0\s+FILE\s/im.test(text)) text = "0 FILE model.ldr\n" + text;
    const embedded = new Set(
      [...text.matchAll(/^0\s+FILE\s+(.+)$/gim)].map((match) =>
        match[1]
          .trim()
          .toLowerCase()
          .replace(/^parts\//, ""),
      ),
    );
    for (const entry of entries) {
      const path = safeName(entry.filename)
        .replace(/^CustomParts\//i, "")
        .replace(/^parts\//i, "");
      if (
        entry === main ||
        entry.directory ||
        !/\.(dat|ldr|mpd)$/i.test(path) ||
        embedded.has(path.toLowerCase())
      )
        continue;
      text += `\n0 FILE ${path}\n${await read(entry)}`;
      embedded.add(path.toLowerCase());
    }
    return parseLDraw(text, name.replace(/\.io$/i, ""));
  } catch (error) {
    throw new Error(
      `Could not open Studio file: ${error instanceof Error ? error.message : "invalid archive"}. You can also export LDraw from native Studio.`,
    );
  } finally {
    await reader.close();
  }
}
export async function readModelFile(file: File): Promise<Project> {
  if (file.size > MAX_FILE_SIZE)
    throw new Error("Choose a model smaller than 16 MB.");
  if (/\.io$/i.test(file.name)) return readStudioArchive(file, file.name);
  const text = await file.text();
  return /\.(ldr|mpd)$/i.test(file.name)
    ? parseLDraw(text, file.name)
    : parseProject(text);
}
