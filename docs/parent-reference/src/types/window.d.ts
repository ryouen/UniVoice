// Window interface extension for Electron IPC
interface Window {
  electron: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    sendAudioChunk: (chunk: ArrayBuffer | Buffer) => void;
  };
  electronAPI?: any; // Legacy API
}