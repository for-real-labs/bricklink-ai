/// <reference types="vite/client" />
interface Window {
  bricklinkDesktop?: {
    platform: string;
    onMenu: (callback: (action: string) => void) => () => void;
  };
}
