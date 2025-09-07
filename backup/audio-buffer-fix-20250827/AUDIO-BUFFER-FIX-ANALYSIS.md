# Audio Buffer IPC問題の分析と修正

## 問題の概要
音声認識が開始されない問題。Deepgramへの音声データ送信でエラーが発生。

## エラー内容
```
[UnifiedPipelineService] Invalid audio buffer: { isBuffer: false, length: 1024 }
```

## 根本原因
ElectronのIPC通信でBufferオブジェクトが自動的にシリアライズされる際、以下の変換が発生：

1. **レンダラー側（送信）**：
   - `ArrayBuffer` → `Buffer.from(chunk)` でBufferに変換
   - `ipcRenderer.send('audio-chunk', buffer)`で送信

2. **IPC通信層**：
   - BufferオブジェクトがJSON形式にシリアライズ
   - 形式：`{ type: 'Buffer', data: [数値配列] }`

3. **メインプロセス側（受信）**：
   - 受信データはプレーンオブジェクト（Buffer.isBuffer() = false）
   - そのままUnifiedPipelineServiceに渡すとエラー

## 実装した修正

### main.ts（478行目〜）
```javascript
// Handle audio chunks from renderer
ipcMain.on('audio-chunk', (_event, data: any) => {
  try {
    // IPC serialization converts Buffer to {type: 'Buffer', data: number[]}
    // We need to reconstruct the Buffer
    let buffer: Buffer;
    if (Buffer.isBuffer(data)) {
      buffer = data;
    } else if (data && data.type === 'Buffer' && Array.isArray(data.data)) {
      // Reconstruct Buffer from serialized form
      buffer = Buffer.from(data.data);
      console.log('[Main] Reconstructed Buffer from IPC data, size:', buffer.length);
    } else if (data && data.data) {
      // Try to create Buffer from data property
      buffer = Buffer.from(data.data);
      console.log('[Main] Created Buffer from data property, size:', buffer.length);
    } else {
      console.error('[Main] Invalid audio chunk format:', data);
      return;
    }
    
    if (pipelineService && buffer && buffer.length > 0) {
      pipelineService.sendAudioChunk(buffer);
      // Sampling log (about once per second)
      if (Math.random() < 0.05) {
        mainLogger.debug('Audio chunk forwarded to pipeline', { size: buffer.length });
      }
    }
  } catch (error) {
    mainLogger.error('Audio chunk processing failed', {
      error: error instanceof Error ? error.message : String(error),
      dataType: typeof data,
      hasData: data?.data !== undefined
    });
  }
});
```

## データフロー
```
レンダラー
  ↓ ArrayBuffer (PCM16 audio data)
preload.ts
  ↓ Buffer.from(chunk)
IPC層
  ↓ シリアライズ: {type: 'Buffer', data: [...]}
main.ts
  ↓ Buffer.from(data.data) で再構築
UnifiedPipelineService
  ↓ Bufferとして送信
Deepgram WebSocket
```

## テスト方法
1. アプリケーションを起動
2. Electronのコンソールで以下を確認：
   - `[Main] Audio chunk received:` ログ
   - `[Main] Reconstructed Buffer from IPC data` メッセージ
   - `[UnifiedPipelineService] sendAudioChunk called` メッセージ

## 注意事項
- Windowsでは`ArrayBuffer`のみが安全に送信可能（SharedArrayBufferは除外）
- Buffer再構築時にパフォーマンスへの影響は最小限（16kHz, 20msフレームで約1KB/チャンク）

## 関連ファイル
- `electron/main.ts` - IPC音声チャンクハンドラー（修正済み）
- `electron/preload.ts` - sendAudioChunk実装
- `src/hooks/useUnifiedPipeline.ts` - 音声キャプチャと送信
- `electron/services/domain/UnifiedPipelineService.ts` - Deepgram WebSocket送信