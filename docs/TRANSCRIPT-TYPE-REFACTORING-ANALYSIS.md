# TranscriptSegment型定義リファクタリング分析
作成日: 2025-09-27

## 現状分析

### 実際に使用されているプロパティ

#### 1. UnifiedPipelineService.ts での使用
```typescript
// line 1181-1187
const segment = {
  id: result.id,
  text: result.text,
  timestamp: result.timestamp,
  confidence: result.confidence,
  isFinal: result.isFinal
};
```
**実際の使用**: id, text, timestamp, confidence, isFinal

#### 2. SentenceCombiner.ts での使用
```typescript
// addSegment メソッドで受け取るが、実際に使用されるのは:
- segment.isFinal (line 84)
- segment.text (line 115: s.text.trim())
- segment.id (line 179: s.id)
- segment.timestamp (line 181, 182)
```
**実際の使用**: id, text, timestamp, isFinal

#### 3. src/domain/models/Transcript.ts での定義
現在最も包括的だが、他のファイルから参照されていない

### 使用されていないプロパティ

1. **translation**: TranscriptSegmentに含まれるべきではない（責任の分離）
2. **language**: 現在使用されていないが、多言語対応で必要になる可能性
3. **startMs/endMs**: 渡されるが使用されていない
4. **speakerId**: 将来の拡張用（現在不要）
5. **metadata**: 将来の拡張用（現在不要）

## YAGNI原則に基づく判断

### シニアエンジニアとしての判断基準

1. **現在使用されているもの** → 残す
2. **近い将来（Phase 2-3）で必要** → 残す
3. **遠い将来の可能性** → 削除（必要時に追加）

### 推奨される最小限の型定義

```typescript
export interface TranscriptSegment {
  // 必須プロパティ（全箇所で使用）
  id: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
  
  // オプショナル（一部で使用）
  confidence?: number;    // UnifiedPipelineServiceで使用
  language?: string;      // Phase 3の多言語対応で必要
}
```

### 削除すべきプロパティとその理由

1. **translation**: 別のモデル（Translation）に分離済み
2. **startMs/endMs**: 実際に使用されていない
3. **speakerId**: 話者分離機能の実装時に追加
4. **metadata**: 必要になったときに追加

## 段階的実装計画

### Step 1: 必要最小限の統一型定義
```typescript
// src/domain/models/core/TranscriptSegment.ts
export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
  confidence?: number;
  language?: string;
}
```

### Step 2: 既存コードの更新

1. **UnifiedPipelineService.ts**
   - 型定義をインポート
   - language を設定（this.sourceLanguage）

2. **SentenceCombiner.ts**  
   - 型定義をインポート
   - confidence は使用しないのでオプショナルで問題なし

### Step 3: 将来の拡張時の追加

必要になったときに追加：
- **startMs/endMs**: タイムライン機能実装時
- **speakerId**: 話者分離機能実装時
- **metadata**: 拡張メタデータが必要になったとき

## 結論

**YAGNIの原則に従い、現在実際に使用されているプロパティのみを含む最小限の型定義を採用すべきです。**

将来の拡張性は、TypeScriptの型拡張機能で対応可能：
```typescript
// 将来の拡張例
interface TranscriptSegmentWithTiming extends TranscriptSegment {
  startMs: number;
  endMs: number;
}
```

これにより、現在のコードをシンプルに保ちながら、将来の拡張も容易になります。