import { afterEach, describe, expect, it, vi } from "vitest";
import { download, imageBlob } from "../src/files";
afterEach(() => vi.restoreAllMocks());
describe("file downloads", () => {
  it("uses a blob URL for images instead of navigating to a data URL", () => {
    vi.useFakeTimers();
    const blob = imageBlob("data:image/png;base64,iVBORw0KGgo=");
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBe(8);
    const create = vi.fn(() => "blob:test");
    vi.stubGlobal("URL", { createObjectURL: create, revokeObjectURL: vi.fn() });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.href).toBe("blob:test");
        expect(this.download).toBe("model.png");
        expect(this.isConnected).toBe(true);
      });
    download(blob, "model.png", "image/png");
    expect(click).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith(blob);
    expect(document.querySelector("a[download]")).toBeNull();
    vi.runAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
