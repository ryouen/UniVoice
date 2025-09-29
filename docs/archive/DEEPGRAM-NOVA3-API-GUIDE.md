# Deepgram Nova-3 API 公式ガイド（2025年8月版）

## 概要

このドキュメントは、Deepgram Nova-3モデルとWebSocket Streaming APIの正しい使用方法を記載しています。Nova-3は2025年にリリースされた最新の音声認識モデルで、UniVoiceプロジェクトで実際に使用されています。

## 🔴 重要な確認事項

- **Nova-3は実在のモデルです**（2025年リリース）
- **WebSocket Streaming APIは安定して動作しています**
- **親プロジェクトで動作確認済み**（test-results/で確認可能）

## Nova-3 モデルの特徴

### パフォーマンス
- **53.4%** のWER（Word Error Rate）削減（ストリーミング）
- **47.4%** のWER削減（バッチ処理）
- 競合他社の40倍高速（diarization有効時）
- 業界最速のレイテンシ（Nova-2と同等）

### モデルバリアント
```
nova-3          # 汎用モデル
nova-3-general  # 日常会話最適化
nova-3-medical  # 医療用語最適化
```

### 価格
- **$0.0077/分**（ストリーミング）
- 競合他社の2倍以上コスト効率が良い

## WebSocket Streaming API

### 接続URL
```
wss://api.deepgram.com/v1/listen
```

### 認証方法
```javascript
headers: {
  Authorization: `Token ${DEEPGRAM_API_KEY}`
}
```

### 重要なパラメータ

| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|------------|------|
| model | string | base | 使用するモデル（nova-3推奨） |
| interim_results | boolean | false | 中間結果の有効化 |
| punctuate | boolean | false | 句読点の自動挿入 |
| diarize | boolean | false | 話者分離 |
| endpointing | number | 10 | 音声終了検出（ミリ秒） |
| utterance_end_ms | number | 1000 | 発話終了待機時間 |
| language | string | en | 主要言語（多言語対応） |
| encoding | string | - | 音声エンコーディング |
| sample_rate | number | - | サンプリングレート |

### UniVoiceでの実装例

```typescript
// UnifiedPipelineService.tsより
private async connectDeepgram(): Promise<void> {
  const params = new URLSearchParams({
    encoding: 'linear16',
    sample_rate: '16000',
    interim_results: 'true',      // 中間結果を有効化
    endpointing: '800',           // 800ms（推奨値）
    utterance_end_ms: '1000',     // 1秒（推奨値）
    punctuate: 'true',            // 句読点を追加
    model: 'nova-3'               // Nova-3モデルを使用
  });
  
  const url = `wss://api.deepgram.com/v1/listen?${params}`;
  
  this.ws = new WebSocket(url, {
    headers: {
      Authorization: `Token ${this.deepgramConfig.apiKey}`
    }
  });
  
  this.ws.on('message', (data: Buffer) => {
    const msg = JSON.parse(data.toString());
    this.handleDeepgramMessage(msg);
  });
}
```

### メッセージフォーマット

#### 音声送信（クライアント → Deepgram）
```javascript
// PCM16 LE形式のバイナリデータを送信
ws.send(audioBuffer); // Buffer
```

#### 認識結果（Deepgram → クライアント）
```json
{
  "type": "Results",
  "channel": {
    "alternatives": [{
      "transcript": "Hello world",
      "confidence": 0.98,
      "words": [
        {
          "word": "Hello",
          "start": 0.0,
          "end": 0.5,
          "confidence": 0.99
        }
      ]
    }]
  },
  "is_final": true,
  "speech_final": true
}
```

## 推奨設定

### リアルタイム翻訳用（UniVoice標準）
```javascript
const deepgramConfig = {
  model: 'nova-3',
  interim_results: true,    // リアルタイム表示のため必須
  punctuate: true,         // 読みやすさのため推奨
  diarize: false,          // 単一話者の場合は不要
  endpointing: 800,        // 自然な会話の区切り
  utterance_end_ms: 1000,  // 文の終了判定
  language: 'en'           // または 'ja' for Japanese
}
```

### 多言語対応
Nova-3は10言語のリアルタイムコードスイッチングに対応：
- 英語（en）
- 日本語（ja）
- スペイン語（es）
- フランス語（fr）
- ドイツ語（de）
- 中国語（zh）
- 韓国語（ko）
- ポルトガル語（pt）
- イタリア語（it）
- オランダ語（nl）

## エラーハンドリング

### 接続エラー
```javascript
ws.on('error', (error) => {
  console.error('WebSocket error:', error);
  // 再接続ロジック
});
```

### レート制限
- 有料プラン: 15同時接続
- 従量課金プラン: 5同時接続
- 超過時: 429 Too Many Requests

## トラブルシューティング

### 音声が認識されない
1. 音声フォーマットを確認（PCM16 LE, 16kHz）
2. 音声レベルを確認
3. `endpointing`値を調整（デフォルト: 10ms）

### 中間結果が表示されない
1. `interim_results: true`を確認
2. WebSocketメッセージハンドリングを確認
3. `is_final: false`のメッセージを処理しているか確認

### 句読点が付かない
1. `punctuate: true`を確認
2. モデルがnova-3であることを確認（baseモデルは精度が低い）

## パフォーマンス最適化

### バッファリング
```javascript
// 20msごとに640バイト（16kHz, 16bit）のチャンクで送信
const frameSize = 640;
const frameMs = 20;
```

### 並列処理
- 音声送信と結果受信は非同期で処理
- 翻訳処理との並列化で低レイテンシを実現

## 参考資料

- Deepgram公式ドキュメント: https://developers.deepgram.com/docs
- WebSocket API リファレンス: https://developers.deepgram.com/reference/speech-to-text-api/listen-streaming
- Nova-3 リリースノート: https://deepgram.com/learn/introducing-nova-3-speech-to-text-api
- 親プロジェクトの実装: `../realtime_transtrator/electron/services/UnifiedPipelineService.ts`

---

最終更新: 2025-08-22
確認者: UniVoice開発チーム