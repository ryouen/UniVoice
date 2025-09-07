import { contextBridge, ipcRenderer } from "electron";

// Electronブリッジを作成（完全差し替え）
contextBridge.exposeInMainWorld('electron', {
  // ✅ 正しい引数展開
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),

  on: (channel: string, listener: (event: any, ...args: any[]) => void) => {
    ipcRenderer.on(channel, listener);
  },

  removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, listener);
  },

  // 音声チャンク送信（ArrayBuffer/Bufferを許容）
  sendAudioChunk: (chunk: ArrayBuffer | Buffer) => {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    ipcRenderer.send('audio-chunk', buffer);
  }
});

// デバッグ：ブリッジ露出確認（初回起動時に1行だけ出る）
console.info('[preload] electron & electronAPI bridge exposed');

// UniVoice Pipeline API
contextBridge.exposeInMainWorld("electronAPI", {
  // Pipeline control
  startPipelineFile: (path: string) => ipcRenderer.invoke('pipeline:startFile', path),
  startPipelineMic: () => ipcRenderer.invoke('pipeline:startMic'),
  stopPipeline: () => ipcRenderer.invoke('pipeline:stop'),
  translateUserInput: (text: string, from?: string, to?: string) => 
    ipcRenderer.invoke('pipeline:translateUser', text, from, to),
  getPipelineState: () => ipcRenderer.invoke('pipeline:getState'),
  
  // Event listeners
  onPipelineStarted: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('pipeline:started', listener);
    return () => ipcRenderer.removeListener('pipeline:started', listener);
  },
  onPipelineStopped: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('pipeline:stopped', listener);
    return () => ipcRenderer.removeListener('pipeline:stopped', listener);
  },
  onDeepgramConnected: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('pipeline:deepgramConnected', listener);
    return () => ipcRenderer.removeListener('pipeline:deepgramConnected', listener);
  },
  onCurrentOriginalUpdate: (callback: (text: string) => void) => {
    const listener = (_: any, text: string) => callback(text);
    ipcRenderer.on('current-original-update', listener);
    return () => ipcRenderer.removeListener('current-original-update', listener);
  },
  onCurrentTranslationUpdate: (callback: (text: string) => void) => {
    const listener = (_: any, text: string) => callback(text);
    ipcRenderer.on('current-translation-update', listener);
    return () => ipcRenderer.removeListener('current-translation-update', listener);
  },
  onTranslationComplete: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data);
    ipcRenderer.on('translation-complete', listener);
    return () => ipcRenderer.removeListener('translation-complete', listener);
  },
  onSummaryGenerated: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data);
    ipcRenderer.on('summary-generated', listener);
    return () => ipcRenderer.removeListener('summary-generated', listener);
  },
  onUserTranslation: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data);
    ipcRenderer.on('user-translation', listener);
    return () => ipcRenderer.removeListener('user-translation', listener);
  },
  onFinalReport: (callback: (report: any) => void) => {
    const listener = (_: any, report: any) => callback(report);
    ipcRenderer.on('final-report', listener);
    return () => ipcRenderer.removeListener('final-report', listener);
  },
  onPipelineError: (callback: (error: string) => void) => {
    const listener = (_: any, error: string) => callback(error);
    ipcRenderer.on('pipeline:error', listener);
    return () => ipcRenderer.removeListener('pipeline:error', listener);
  },
  
  // Legacy API (後方互換性のため)
  onResetView: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('reset-view', listener);
    return () => ipcRenderer.removeListener('reset-view', listener);
  },
  onSolutionStart: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('solution-start', listener);
    return () => ipcRenderer.removeListener('solution-start', listener);
  },
  onUnauthorized: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('unauthorized', listener);
    return () => ipcRenderer.removeListener('unauthorized', listener);
  },
  onProblemExtracted: (callback: (data: any) => void) => {
    const listener = (_: any, data: any) => callback(data);
    ipcRenderer.on('problem-extracted', listener);
    return () => ipcRenderer.removeListener('problem-extracted', listener);
  }
});