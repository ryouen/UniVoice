# RealtimeDisplayManager 修正報告書
日付: 2025-08-24

## 概要
助言AIからの指摘に基づき、RealtimeDisplayManager.tsの削除ロジックに関する重大な問題を修正しました。

## 発見された問題

### 1. updateDisplayStatesメソッドの削除ロジック（L341-347）
```typescript
// 問題のコード
if (canDelete) {
  const index = this.segments.indexOf(segment);
  if (index > -1 && this.segments.length > this.maxDisplaySegments) {
    this.segments.splice(index, 1);  // 配列を直接変更（危険）
    needsUpdate = true;
  }
}
```
**問題点**: 
- forEachループ内で配列を直接変更しており、インデックスがずれる可能性
- active/fadingセグメントが誤って削除される可能性

### 2. startNewSegmentメソッドの削除ロジック（L246-257）
```typescript
// 問題のコード
const removeCount = this.segments.length - this.maxDisplaySegments;
this.segments = this.segments.slice(removeCount);  // 先頭から削除
```
**問題点**: 
- slice(removeCount)は先頭から削除するため、まだ表示中のactive/fadingセグメントを削除する可能性
- 最小表示時間や翻訳表示時間を考慮していない

## 実装された修正

### 1. 統一された削除ロジック pruneSegments メソッドの追加
統一された削除ロジックを実装し、以下の条件を満たすセグメントのみを削除対象としました：
- status が 'completed' であること（active/fadingは保護）
- 最小表示時間（1.5秒）を経過していること
- 翻訳表示後1.5秒を経過していること

### 2. 既存の削除ロジックの除去
- updateDisplayStatesから直接削除を削除し、pruneSegmentsに委譲
- startNewSegmentの不適切な削除ロジックをpruneSegmentsに置き換え

## 修正の利点

1. **安全性の向上**
   - active/fadingセグメントが誤って削除されることがなくなった
   - 削除ロジックが一箇所に集約され、保守性が向上

2. **表示品質の改善**
   - 最小表示時間（1.5秒）が確実に保証される
   - 翻訳表示後も1.5秒間は確実に表示される

3. **コードの明確性**
   - 削除条件が明確に定義され、理解しやすくなった
   - 将来の拡張や修正が容易になった

## バックアップ
- 元のファイルは backup/2025-08-24-display-fix/RealtimeDisplayManager.ts.bak に保存

## テスト推奨事項
1. 長時間の音声入力で、セグメントが適切に削除されることを確認
2. active/fadingセグメントが保護されることを確認
3. 翻訳表示後1.5秒間は削除されないことを確認