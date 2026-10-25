import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LibraryThumbnail } from "../src/components/LibraryThumbnail";
import { partThumbnail } from "../src/scene/thumbnails";
vi.mock("../src/scene/thumbnails", () => ({ partThumbnail: vi.fn() }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("loads catalog geometry only when its card is visible and leaves a fallback on failure", async () => {
  let visible: IntersectionObserverCallback = () => {};
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        visible = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.mocked(partThumbnail).mockRejectedValueOnce(new Error("Offline"));
  render(<LibraryThumbnail id="3700" category="Technic" />);
  expect(partThumbnail).not.toHaveBeenCalled();
  await act(async () => {
    visible(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  });
  expect(partThumbnail).toHaveBeenCalledWith("3700");
  expect(screen.getByText("Technic")).toBeInTheDocument();
});
it("replaces the category placeholder with the rendered part thumbnail", async () => {
  let visible: IntersectionObserverCallback = () => {};
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        visible = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.mocked(partThumbnail).mockResolvedValueOnce("data:image/png;base64,AA==");
  const { container } = render(
    <LibraryThumbnail id="3700" category="Technic" />,
  );
  await act(async () => {
    visible(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  });
  expect(container.querySelector("img")).toHaveAttribute(
    "src",
    "data:image/png;base64,AA==",
  );
  expect(screen.queryByText("Technic")).not.toBeInTheDocument();
});
