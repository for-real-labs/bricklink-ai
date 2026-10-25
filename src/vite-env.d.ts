/// <reference types="vite/client" />
interface Window {
  brickbuilderStudioDesktop?: {
    platform: string;
    openBrickBuilder: (url: string) => Promise<void>;
    openInBrickLink: (model: {
      name: string;
      content: string;
    }) => Promise<void>;
    onMenu: (callback: (action: string) => void) => () => void;
  };
}
