# DEEP-THINK: SentenceCombiner問題の根本的修正

## 実施日時
2025-09-01

## 問題の深層分析

### 発見した問題
1. **minSegments = 2 の制約**
   - 1セグメントの文が履歴に表示されない
   - "This pin is super expensive." のような短い文が無視される

2. **文末判定の限定性**
   - 疑問符・感嘆符のみ（？！?!）
   - ピリオドや句点が含まれていない

3. **forceEmitメソッドの実装状態**
   - 実装は存在したが、改善の余地があった

## 実装した修正

### 1. minSegments = 1 に変更
```typescript
// UnifiedPipelineService.ts:201
minSegments: 1  // DEEP-THINK修正: 短い文も履歴に含める（元は2）
```

### 2. 文末判定の拡張
```typescript
// SentenceCombiner.ts:142
return /[？！?!。\.]\s*$/.test(text);  // ピリオドと句点を追加
```

### 3. forceEmitメソッドの改善
```typescript
// より詳細なログを追加
console.log('[SentenceCombiner] Force emit called with', this.segments.length, 'segments');
```

## 影響範囲
- 履歴表示の完全性向上
- ユーザー体験の改善
- セッション終了時の信頼性向上

## テスト項目
1. 1セグメントの文が履歴に表示されること
2. ピリオドで終わる文が適切に結合されること
3. セッション終了時に残りの文が出力されること
4. タイムアウト（2秒）が正しく動作すること

## 次のステップ
- 実際の音声入力でのテスト
- パフォーマンスへの影響評価
- ユーザーフィードバックの収集