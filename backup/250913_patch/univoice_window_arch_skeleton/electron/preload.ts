import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('uv', {
  setup: {
    setDesiredBounds: (width: number, height: number) => ipcRenderer.invoke('setup:setDesiredBounds', width, height),
    enterMain: () => ipcRenderer.invoke('setup:enterMain'),
  },
  windows: {
    openHistory: () => ipcRenderer.invoke('windows:openHistory'),
    openSummary: () => ipcRenderer.invoke('windows:openSummary'),
    toggleHistory: () => ipcRenderer.invoke('windows:toggleHistory'),
    toggleSummary: () => ipcRenderer.invoke('windows:toggleSummary'),
  },
});
