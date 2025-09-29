# 🔍 UniVoice 2.0 発見されたミスと修正内容のドキュメント

## 📊 概要

UniVoice 2.0のデバッグ過程で発見された重大なミスとその修正内容を体系的にまとめます。これらの問題は主にイベント駆動アーキテクチャの実装不備と、知識カットオフ後の技術に対する誤解から生じていました。

## 🐛 発見されたミスと修正

### 1. イベントチャンネル名の不一致

**問題の詳細**：
- バックエンド（UnifiedPipelineService.ts）: `translationComplete` (camelCase)
- フロントエンド（useUnifiedPipeline.ts）: `translation-complete` (kebab-case)
- 影響: 翻訳完了イベントが届かず、履歴が表示されない

**修正内容**：
```typescript
// UniVoice/src/hooks/useUnifiedPipeline.ts:474
window.electron.on('translation-complete', translationCompleteListener);

// UniVoice/electron/main.ts:328
mainWindow.webContents.send('translation-complete', data);
```

**根本原因**: Clean Architectureへの移行時に命名規約の統一が漏れていた

---

### 2. allowedChannelsリストの不完全性

**問題の詳細**：
- preload.tsのallowedChannelsリストに重要なチャンネルが欠落
- 特に`translation-complete`、`summary-generated`、`final-report`等が未登録
- 影響: IPCイベントがブロックされ、フロントエンドに届かない

**修正内容**：
```typescript
// UniVoice/electron/preload.ts
const allowedChannels = [
  'univoice:event',
  'univoice:command',
  'univoice:debug',
  'audio-chunk',
  'current-original-update',
  'current-translation-update',
  'translation-complete',  // 追加
  'pipeline:started',      // 追加
  'pipeline:stopped',      // 追加
  // ... その他の欠落チャンネル
];
```

---

### 3. main.tsでのイベント転送の欠落

**問題の詳細**：
- pipelineServiceから発火されるイベントの大部分が転送されていない
- currentOriginalUpdateとcurrentTranslationUpdateのみ実装
- 影響: パイプラインの状態変化や完了通知が UI に反映されない

**修正内容**：
```typescript
// UniVoice/electron/main.ts:324-380
// 他の重要なイベントの転送を追加
pipelineService.on('translationComplete', (data) => {
  mainLogger.debug('translationComplete event', data);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('translation-complete', data);
  }
});

pipelineService.on('started', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('pipeline:started');
  }
});
// ... 他のイベントも同様に追加
```

---

### 4. APIパラメータの誤認識

**誤った認識**（私の知識カットオフによる誤解）：
- ❌ `responses.stream` → 実在しない（誤り）
- ❌ `input` パラメータ → 実在しない（誤り）
- ❌ `max_output_tokens` → 実在しない（誤り）
- ❌ `reasoning: { effort: 'minimal' }` → 実在しない（誤り）

**正しい認識**（2025年8月時点のOpenAI API）：
- ✅ Responses APIは実在し、`responses.stream`と`responses.create`メソッドを提供
- ✅ `input`パラメータを使用（`messages`ではない）
- ✅ `max_output_tokens`を使用（`max_tokens`ではない）
- ✅ `reasoning: { effort: 'minimal' }`パラメータが存在

**親プロジェクトの実装**：
```typescript
// realtime_transtrator/electron/services/UnifiedPipelineService.ts:372
const stream = await this.openai.responses.stream({
  model: this.openaiConfig.models.translate,
  input: [...],
  max_output_tokens: this.openaiConfig.maxTokens.translate,
  reasoning: { effort: 'minimal' }
});
```

**確認済み**: 親プロジェクトはこの実装で動作している。これが2025年8月時点の正しいOpenAI Responses APIの呼び出し方法です

---

### 5. 重複イベントリスナーの問題

**問題の詳細**：
- useEffectの依存配列にコールバック関数が含まれ、リロード時に重複登録
- 影響: イベントが複数回処理され、パフォーマンス低下や予期しない動作

**修正内容**：
```typescript
// UniVoice/src/hooks/useUnifiedPipeline.ts:487
}, []); // 空の依存配列に変更 - マウント時のみ実行
```

---

## 🎯 アーキテクチャ上の問題

### Clean Architecture違反

1. **直接的なイベント転送**
   - main.tsが直接pipelineServiceのイベントをレンダラーに転送
   - 本来はIPCGatewayを経由すべき

2. **命名規約の不統一**
   - camelCase vs kebab-case の混在
   - 新旧アーキテクチャの命名が混在

3. **親フォルダ互換の実装**
   - 「互換性のため」という理由で旧実装を引きずっている
   - Clean Architectureの原則に反する

---

## 💡 学んだ教訓

1. **イベント駆動アーキテクチャでは命名規約の統一が致命的に重要**
2. **IPCチャンネルのホワイトリスト管理は慎重に**
3. **アーキテクチャ移行時は旧実装との互換性より一貫性を優先すべき**
4. **知識カットオフ後の技術については、実装が動作している場合それを真実として扱う**
5. **私の知識が古い場合、最新のAPIドキュメントと実際の動作を優先する**

---

## 🔮 今後の推奨事項

1. **イベントチャンネル定義の一元管理**
   ```typescript
   // shared/constants/channels.ts
   export const IPC_CHANNELS = {
     TRANSLATION_COMPLETE: 'translation-complete',
     CURRENT_ORIGINAL_UPDATE: 'current-original-update',
     // ... 全チャンネルを定義
   } as const;
   ```

2. **型安全なイベントシステムの導入**
   - Zodによる契約定義は良いが、チャンネル名も型で保護すべき

3. **E2Eテストの追加**
   - イベントフローの完全性を自動検証

4. **ドキュメントの更新**
   - CLAUDE.mdの誤った情報（Responses API等）を修正
   - ただし親プロジェクトが動作している以上、慎重に判断

---

このドキュメントは2025-08-22時点の分析結果です。UniVoice 2.0の安定化に向けて、これらの修正を確実に実装し、同様の問題が再発しないよう注意深く開発を進める必要があります。