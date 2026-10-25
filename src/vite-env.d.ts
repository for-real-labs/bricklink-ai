/// <reference types="vite/client" />
interface Window {
  brickbuilderStudioDesktop?: {
    platform: string;
    onMenu: (callback: (action: string) => void) => () => void;
  };
}
