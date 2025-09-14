export {};
declare global {
  interface Window {
    uv: {
      setup: {
        setDesiredBounds: (width: number, height: number) => Promise<void>;
        enterMain: () => Promise<void>;
      };
      windows: {
        openHistory: () => Promise<void>;
        openSummary: () => Promise<void>;
        toggleHistory: () => Promise<void>;
        toggleSummary: () => Promise<void>;
      };
    };
  }
}
