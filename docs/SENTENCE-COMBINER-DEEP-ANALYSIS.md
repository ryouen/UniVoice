# SentenceCombiner 深層分析と改善提案

## 現状分析

### 現在の実装の強み
1. **文末パターン認識**: 日本語・英語の主要な文末記号をカバー
2. **不完全文パターン**: カンマや接続詞、助詞で継続判定
3. **タイムアウト機構**: 2秒で強制出力により無限待機を防止
4. **柔軟な設定**: minSegments、maxSegments、timeoutMsで動作調整可能

### 現在の実装の課題

#### 1. isDefinitelySentenceEndメソッドの限定性
```typescript
// 現在: 疑問符・感嘆符のみ
private isDefinitelySentenceEnd(text: string): boolean {
  return /[？！?!]\s*$/.test(text);
}
```

**問題点**:
- ピリオド（.）や句点（。）が含まれていない
- "OK.", "はい。", "I see." などの短い完結文が無視される
- 文化的な違い（日本語では短い応答が多い）を考慮していない

#### 2. タイムアウト処理の一貫性欠如
```typescript
// タイムアウト時の処理
setTimeout(() => {
  if (this.segments.length > 0) {
    this.emitCombinedSentence(); // minSegmentsチェックあり
  }
}, this.options.timeoutMs);
```

**問題点**:
- タイムアウト時もminSegmentsチェックが適用される
- 授業の一時停止時に最後の発言が失われる可能性
- ユーザーが「それだけ？」と混乱する場面がある

#### 3. セッション終了時の不完全な処理
```typescript
forceEmit(): void {
  if (this.segments.length > 0) {
    this.emitCombinedSentence(); // 通常のチェックが適用される
  }
}
```

**問題点**:
- forceEmitという名前にも関わらず、強制的でない
- セッション終了時に未処理セグメントが残る
- ユーザーの最後の発言が履歴に残らない

## 改善提案

### 1. 文末判定の改善

```typescript
// 改善案: より包括的な文末判定
private isDefinitelySentenceEnd(text: string): boolean {
  // 短い完結文パターン
  const shortCompleteSentences = [
    /^(OK|Okay|Yes|No|Maybe|Sure|Right|Exactly|Indeed|Correct|Wrong|Thanks|Sorry|Please|Hello|Hi|Bye|Goodbye)\.?\s*$/i,
    /^(はい|いいえ|そう|そうです|わかりました|了解|承知|ありがとう|すみません|お願いします|こんにちは|さようなら)[。．]?\s*$/,
    /^(I see|I understand|Got it|No problem|Thank you|You're welcome|Good morning|Good night)\.?\s*$/i,
  ];
  
  // 短い文でも完結と判定
  if (shortCompleteSentences.some(pattern => pattern.test(text))) {
    return true;
  }
  
  // 従来の文末記号チェック（ピリオドと句点を追加）
  return /[。．.!?！？]\s*$/.test(text);
}

// 文の品質判定も追加
private isQualitySentence(text: string): boolean {
  // ノイズや誤認識の除外
  const noisePatterns = [
    /^[ぁ-ん]{1,2}$/,        // 単独のひらがな1-2文字
    /^[a-z]{1,2}$/i,         // 単独のアルファベット1-2文字
    /^\d+$/,                 // 数字のみ
    /^[\s\.,;:]+$/,         // 記号のみ
  ];
  
  if (noisePatterns.some(pattern => pattern.test(text.trim()))) {
    return false;
  }
  
  // 最低限の長さ（ただし完結文は除外）
  if (text.length < 3 && !this.isDefinitelySentenceEnd(text)) {
    return false;
  }
  
  return true;
}
```

### 2. 段階的な強制出力

```typescript
// 新しいメソッド: 条件付き強制出力
private forceEmitWithConditions(ignoreMinSegments: boolean = false): void {
  if (this.segments.length === 0) return;
  
  const combinedText = this.getCombinedText();
  if (!combinedText) {
    this.segments = [];
    return;
  }
  
  // 品質チェック（ノイズ除外）
  if (!ignoreMinSegments && !this.isQualitySentence(combinedText)) {
    console.log('[SentenceCombiner] Low quality text, skipping:', combinedText);
    this.segments = [];
    return;
  }
  
  // minSegmentsを無視するオプション
  if (ignoreMinSegments || this.segments.length >= this.options.minSegments) {
    this.emitCombinedSentence();
  }
}

// タイムアウト処理の改善
private resetTimeoutTimer(): void {
  if (this.timeoutTimer) {
    clearTimeout(this.timeoutTimer);
  }
  
  this.timeoutTimer = setTimeout(() => {
    if (this.segments.length > 0) {
      console.log('[SentenceCombiner] Timeout - forcing emission');
      // タイムアウト時は条件を緩める
      this.forceEmitWithConditions(this.segments.length >= 1);
    }
  }, this.options.timeoutMs);
}

// セッション終了時の完全な強制出力
forceEmitAll(): void {
  if (this.segments.length > 0) {
    console.log('[SentenceCombiner] Force emitting all segments');
    this.forceEmitWithConditions(true); // 全条件を無視
  }
}
```

### 3. コンテキスト認識型の結合

```typescript
interface SentenceCombinerOptions {
  maxSegments?: number;
  timeoutMs?: number;
  minSegments?: number;
  // 新規オプション
  contextualMode?: boolean;      // 文脈を考慮した結合
  qualityThreshold?: boolean;    // 品質チェックの有効化
  aggressiveCombining?: boolean; // 積極的な結合（短い文も結合）
}

// 文脈を考慮した結合判定
private shouldCombineWithNext(currentText: string, bufferLength: number): boolean {
  if (!this.options.contextualMode) return false;
  
  // 接続を示唆するパターン
  const continuationPatterns = [
    /[,、]\s*$/,                          // カンマで終わる
    /\b(and|or|but|so|because)\s*$/i,    // 接続詞で終わる
    /(は|が|を|に|で|と|の|から|まで)\s*$/,  // 助詞で終わる
    /\b(the|a|an|in|on|at|to|for)\s*$/i, // 前置詞・冠詞で終わる
  ];
  
  // バッファが少ない場合は積極的に結合
  if (bufferLength < this.options.minSegments && 
      continuationPatterns.some(p => p.test(currentText))) {
    return true;
  }
  
  return false;
}
```

### 4. パフォーマンスとUXの最適化

```typescript
class SentenceCombinerV2 {
  // 統計情報の追加
  private stats = {
    totalSegments: 0,
    totalSentences: 0,
    averageSegmentsPerSentence: 0,
    shortSentences: 0,
    timeoutEmissions: 0,
    forceEmissions: 0,
  };
  
  // 適応的なパラメータ調整
  private adaptParameters(): void {
    // 短い文が多い場合は minSegments を下げる
    if (this.stats.shortSentences / this.stats.totalSentences > 0.3) {
      this.options.minSegments = Math.max(1, this.options.minSegments - 1);
      console.log('[SentenceCombiner] Adapted minSegments to:', this.options.minSegments);
    }
    
    // タイムアウトが頻発する場合は timeout を延長
    if (this.stats.timeoutEmissions / this.stats.totalSentences > 0.5) {
      this.options.timeoutMs = Math.min(5000, this.options.timeoutMs + 500);
      console.log('[SentenceCombiner] Adapted timeoutMs to:', this.options.timeoutMs);
    }
  }
  
  // 統計情報の取得
  getStatistics() {
    return {
      ...this.stats,
      currentBufferSize: this.segments.length,
      currentBufferText: this.getCombinedText(),
    };
  }
}
```

## 推奨実装計画

### Phase 1: 基本的な改善（即時実装可能）
1. `isDefinitelySentenceEnd` にピリオドと句点を追加
2. `forceEmitAll` メソッドの追加（セッション終了時用）
3. 品質チェック関数の追加（ノイズ除外）

### Phase 2: 高度な改善（テスト必要）
1. コンテキスト認識型の結合ロジック
2. 適応的パラメータ調整
3. 統計情報とモニタリング

### Phase 3: UX最適化（ユーザーフィードバック後）
1. 言語別の最適化（日本語は短い文が多い）
2. ドメイン別の調整（講義 vs 会話）
3. ユーザー設定可能なオプション

## 期待される効果

### ユーザー体験の向上
1. **完全性の向上**: 短い応答も確実に履歴に残る
2. **自然な文単位**: より意味のある単位で履歴表示
3. **信頼性**: セッション終了時も全て保存

### システムパフォーマンス
1. **メモリ効率**: ノイズ除外により無駄なデータを削減
2. **処理効率**: 適応的な調整により最適な動作
3. **保守性**: 統計情報により問題の早期発見

## まとめ

現在のSentenceCombinerは基本的な機能を果たしていますが、実際の使用シナリオ（特に日本語環境や授業終了時）において改善の余地があります。提案した改善により、より自然で信頼性の高い文単位の履歴管理が実現できます。

特に重要なのは：
1. 文末判定の包括性向上
2. 強制出力の段階的な実装
3. セッション終了時の完全性保証

これらの改善により、ユーザーは「なぜこの発言が履歴に残らないの？」という疑問を持つことなく、安心してシステムを使用できるようになります。