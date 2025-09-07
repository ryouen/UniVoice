# UniVoice 2.0 クイックリファレンス

## 🚀 即座に開始するコマンド

```bash
# 1. 現在の状況を確認
cat docs/ACTIVE/SESSION-HANDOVER.md

# 2. 診断ページでテスト
npm run electron
# → test-integration.htmlが開く
# → "Check APIs" → "Start Session" でテスト

# 3. バックエンドの動作確認
node test-session-start.js
node test-ipc-integration.js
```

## 🔍 問題: セッション開始エラー

### 症状
- 「授業を開始」ボタン → 「セッションの開始に失敗しました」

### 原因
- バックエンド: ✅ 正常動作
- React統合: ❌ window.univoice呼び出しに問題

### 修正箇所
```typescript
// src/hooks/useSession.ts:135
const result = await window.univoice?.startListening({
  sourceLanguage: config.sourceLanguage,
  targetLanguage: config.targetLanguage,
  correlationId: correlationId.current
});
```

## 📁 重要ファイルパス

### テストツール
- `test-integration.html` - ブラウザAPIテスト
- `test-session-start.js` - バックエンドテスト
- `test-ipc-integration.js` - IPC通信テスト

### 修正対象
- `src/hooks/useSession.ts` - セッション管理
- `src/components/UniVoice/UniVoiceContainer.tsx` - UIコンテナ

### ログ確認
- Electronコンソール: DevTools
- バックエンドログ: `[Main]`プレフィックス

## ⚡ トラブルシューティング

### window.univoiceが未定義
```javascript
// 追加する修正
useEffect(() => {
  const checkAPI = setInterval(() => {
    if (window.univoice) {
      console.log('UniVoice API ready');
      clearInterval(checkAPI);
    }
  }, 100);
}, []);
```

### ビルドエラー
```bash
# TypeScriptビルド
npx tsc -p electron/tsconfig.json

# 全体ビルド
npm run build
```

## 📊 動作確認チェックリスト

- [ ] test-integration.htmlでAPIが利用可能
- [ ] Start Session成功（コンソールログ確認）
- [ ] Pipeline Eventが受信される
- [ ] Stop Session成功
- [ ] React UIからセッション開始可能