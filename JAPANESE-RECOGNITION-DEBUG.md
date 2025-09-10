# 日本語音声認識デバッグガイド

## 問題の概要
日本語での音声認識がうまく動作しない問題について

## 調査結果

### 1. コード実装の確認 ✅
- 言語パラメータの伝達経路は正しく実装されています
- `ja` → `multi` の変換も実装済みです
- ビルド済みファイルにも反映されています

### 2. Deepgram API仕様の不明確さ
Nova-3での日本語サポートについて、以下の矛盾する情報があります：
- 2025年3月の情報：日本語には`language=multi`を使用
- 公式ドキュメント：`ja`は有効な言語コード

## 実装した改善

### 1. デバッグログの追加
以下のデバッグログを追加しました：
- WebSocket URL全体の表示
- エラー時の詳細情報（言語設定含む）
- 日本語認識結果の詳細ログ

### 2. 言語パラメータの柔軟な設定
環境変数で言語パラメータの動作を制御可能にしました：
```bash
# .envファイルに追加
DEEPGRAM_USE_MULTI_FOR_JAPANESE=true  # デフォルト: true
```

- `true`（デフォルト）: `ja` → `multi` に変換
- `false`: `ja` をそのまま使用

## デバッグ手順

### 1. ビルドして最新の変更を反映
```bash
# TypeScriptをJavaScriptにコンパイル
npm run build

# Electronアプリを起動
npm run electron
```

### 2. コンソールログを確認
Developer Tools（Ctrl+Shift+I）を開いて以下を確認：
```
[DeepgramAdapter] Language parameter logic: {
  originalLanguage: 'ja',
  useMultiForJapanese: true,
  finalLanguageParam: 'multi'
}
[DeepgramAdapter] Final WebSocket URL: wss://api.deepgram.com/v1/listen?...
```

### 3. エラーメッセージを確認
エラーが発生した場合、以下の詳細ログを確認：
```
[DeepgramAdapter] WebSocket error details: {
  message: "...",
  code: "...",
  sourceLanguage: "ja",
  wsUrlWithoutKey: "..."
}
```

### 4. 日本語認識結果を確認
日本語が認識された場合の詳細：
```
[DeepgramAdapter] Japanese recognition result: {
  text: "認識されたテキスト",
  confidence: 0.95,
  isFinal: true,
  language: "multi"  // または "ja"
}
```

## トラブルシューティング

### ケース1: 400 Bad Request エラー
```bash
# multiパラメータを無効化してみる
DEEPGRAM_USE_MULTI_FOR_JAPANESE=false npm run electron
```

### ケース2: 音声認識されない
1. マイクの権限を確認
2. 音声レベルを確認（[UnifiedPipelineService] Sending audio...のログ）
3. サンプルレートを確認（16000Hzであるべき）

### ケース3: 認識精度が低い
```bash
# .envファイルで設定調整
DG_ENDPOINTING=300  # より迅速な応答
DG_SMART_FORMAT=true  # 句読点の追加
```

## 推奨される次のステップ

1. **現在の設定で試す**（デフォルト: `ja` → `multi`）
   ```bash
   npm run build && npm run electron
   ```

2. **うまくいかない場合は`ja`を直接使用**
   ```bash
   DEEPGRAM_USE_MULTI_FOR_JAPANESE=false npm run electron
   ```

3. **Deepgramサポートに確認**
   - Nova-3での日本語の正しいパラメータ
   - `ja` vs `multi` の使い分け
   - 必要な追加設定

## 参考情報

- Deepgram公式ドキュメント: https://developers.deepgram.com/docs/
- Nova-3 Multilingual: 2025年3月31日GA
- サポートされる言語: en, es, fr, de, hi, ru, pt, ja, it, nl