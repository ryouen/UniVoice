# IncrementalTextManager修正記録 - 2025年8月24日（新しい発話検出問題）

## 問題の詳細
「sure okay」の後、新しい発話（「you mean this girl of democracy」など）がUIに表示されない問題。

## 症状
1. 最初の発話は正常に表示・翻訳される
2. 新しい発話のASRイベントは発生している（ログで確認）
3. しかしUIが「sure okay」のまま更新されない

## 根本原因
IncrementalTextManagerが新しい発話を検出した際の処理に問題があった：

1. 新しいテキストが`confirmedText`で始まらない場合、新しい発話として処理
2. しかし`reset()`メソッドが`onUpdate`を呼ばなかった
3. その結果、UIが古い状態のまま残った

## 実施した修正

### 1. update()メソッドの改善
新しい発話検出時の処理を改善：
- 前のセグメントを確定（`confirmCurrentSegment()`）
- confirmedTextをクリア
- 新しいpendingSegmentを作成

### 2. reset()メソッドの改善
リセット時にUIをクリアするよう修正：
```typescript
// リセット時も空文字列で通知（UIをクリアするため）
this.onUpdate('', true);
```

### 3. useUnifiedPipelineの修正
interim結果（isFinal: false）も表示するよう修正（最初の対応）

## 修正効果
1. 新しい発話が正しく検出される
2. 前の発話が確定され、履歴に保存される
3. UIが新しい発話で更新される
4. リアルタイム性が維持される

## テスト観点
- 連続した発話の切り替わり
- 長い沈黙後の新しい発話
- 途中で言い直した場合の処理
- パフォーマンスへの影響

---

作成日: 2025年8月24日
修正実施者: Claude Code
関連Issue: リアルタイム表示の更新停止問題