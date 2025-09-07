# IPC通信統一化分析

## 実施日時
2025-08-25

## 現状の問題点

### 1. 複数のIPCチャンネル混在
```javascript
// 新アーキテクチャ
'univoice:event'

// レガシーチャンネル
'current-original-update'
'current-translation-update'
'display-segment-update'
'asr-event'
'translation-complete'
```

### 2. 重複した状態更新
- 同じデータが複数のチャンネルで送信
- UIで不要なre-renderが発生
- デバッグの複雑化

## 提案された解決策

### IPCチャンネルの一本化
```javascript
// すべてのイベントを univoice:event に統合
mainWindow?.webContents.send('univoice:event', {
  type: 'currentOriginalUpdate',
  data: { text, isFinal },
  timestamp: Date.now()
});
```

## 影響範囲の分析

### Main Process
- `electron/main.ts` - イベント送信部分
- `electron/services/ipc/gateway.ts` - イベント集約

### Renderer Process  
- `electron/preload.ts` - チャンネル定義
- `src/hooks/useUnifiedPipeline.ts` - イベントリスナー

## リスク評価

### 移行リスク
- **中程度**: 複数ファイルの同時変更が必要
- **テスト必要**: 全機能の動作確認が必須

### パフォーマンスへの影響
- **改善**: 重複排除によりre-render削減
- **簡潔化**: デバッグとメンテナンスが容易に

## 実装判断

**現時点では実装を保留**

### 理由
1. **安定性優先**: 現在のシステムが正常動作中
2. **段階的移行**: まず現在の修正を安定化
3. **影響範囲**: 複数コンポーネントへの影響

### 将来的な実装計画
1. 現在の修正の安定化（1-2週間）
2. テスト環境での検証
3. 段階的な移行実装
4. レガシーチャンネルの廃止

## まとめ
IPC統一化は設計品質向上に有効だが、現時点では安定性を優先。
将来的なリファクタリング項目として文書化し、適切なタイミングで実装する。