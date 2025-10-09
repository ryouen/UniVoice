# データ永続化機能調査結果 (2025-10-09)

## 問題の概要
10分間のTED Talk音声を処理しても、データが一切保存されていない。

## 根本原因
IPCGatewayが実装されているが、main.tsで初期化・接続されていない。

## データフローの断絶箇所

```
Frontend (useUnifiedPipeline)
    ↓
preload.ts: ipcRenderer.invoke('univoice:command', command)
    ↓
    ❌ 断絶: main.tsに 'univoice:command' ハンドラーが存在しない
    ↓
IPCGateway (未使用)
    ↓
domain-command handlers in main.ts (到達不可能)
    ↓
DataPersistenceService
```

## 発見された実装

### 1. IPCGateway (electron/services/ipc/gateway.ts)
- 完全に実装済み
- コマンドルーティング機能あり
- しかし、どこからも使用されていない

### 2. Domain Command Handlers (main.ts lines 915-967)
```typescript
ipcGateway.on('domain-command', async (domainCommand) => {
  switch (domainCommand.type) {
    case 'startSession':
    case 'saveHistoryBlock':
    case 'saveSummary':
    case 'saveSession':
      // 実装済み
  }
});
```

### 3. Frontend Commands (preload.ts)
```typescript
await ipcRenderer.invoke('univoice:command', command);
```

## 修正方法

main.tsに以下を追加する必要がある：

1. IPCGatewayのインポートと初期化
2. `ipcMain.handle('univoice:command')` ハンドラーの実装
3. IPCGatewayとdomain servicesの接続

## その他の発見

### FlexibleHistoryGrouperのテスト問題
- テストは3文/ブロックを期待
- 実装は5文/ブロック (MAX_SENTENCES_PER_BLOCK = 5)
- テストを修正すべき（実装を変更すべきではない）

### スキーマ正規化
- original/translation → sourceText/targetText への正規化層が実装済み
- persistenceSchema.tsで適切に処理されている

## 教訓
1. 実装が存在することと、それが接続されていることは別問題
2. データフロー全体を追跡することの重要性
3. 単体テストと実装の一致を確認する必要性