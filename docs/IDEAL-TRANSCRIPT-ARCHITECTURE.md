# 理想的なTranscriptアーキテクチャ設計
作成日: 2025-09-27

## ドメインモデル設計

### 1. 責任の明確化

```
DeepgramからのASR結果
    ↓
TranscriptSegment（生の文字起こし単位）
    ↓
CombinedSentence（文単位の結合）
    ↓
Translation（翻訳済みペア）
    ↓
HistoryEntry（履歴表示用）
```

### 2. 理想的な型定義

#### TranscriptSegment（音声認識の最小単位）
```typescript
// src/domain/models/Transcript.ts
export interface TranscriptSegment {
  // 識別子
  id: string;                  // ユニークID
  
  // コンテンツ
  text: string;                // 音声認識されたテキスト
  language: string;            // 認識された言語（ISO 639-1）
  
  // メタデータ
  timestamp: number;           // 受信時刻（Unix timestamp）
  startMs: number;            // 音声開始位置（ミリ秒）
  endMs: number;              // 音声終了位置（ミリ秒）
  
  // 品質指標
  confidence: number;          // 信頼度（0.0-1.0）
  isFinal: boolean;           // 最終結果かどうか
  
  // オプション（拡張用）
  speakerId?: string;         // 話者ID（将来の話者分離用）
  metadata?: Record<string, any>; // その他のメタデータ
}
```

#### CombinedSentence（文単位の結合）
```typescript
export interface CombinedSentence {
  id: string;                  // combined_xxx
  segmentIds: string[];        // 結合された元のセグメントID
  
  // コンテンツ
  sourceText: string;          // 結合された原文
  sourceLanguage: string;      // 原文の言語
  
  // タイミング
  startTime: number;           // 最初のセグメントの開始時刻
  endTime: number;             // 最後のセグメントの終了時刻
  
  // メタデータ
  segmentCount: number;        // 結合されたセグメント数
  averageConfidence: number;   // 平均信頼度
}
```

#### Translation（翻訳ペア）
```typescript
export interface Translation {
  id: string;                  // 翻訳ID
  
  // ソース情報
  sourceId: string;            // CombinedSentence ID または Segment ID
  sourceText: string;
  sourceLanguage: string;
  
  // ターゲット情報
  targetText: string;
  targetLanguage: string;
  
  // メタデータ
  timestamp: number;           // 翻訳完了時刻
  model: string;              // 使用したモデル（gpt-5-nano等）
  quality: 'realtime' | 'high'; // 翻訳品質
  processingTimeMs: number;    // 処理時間
}
```

### 3. データフローの最適化

#### 現在の問題
1. TranscriptSegmentに`translation`プロパティがある（責任の混在）
2. `confidence`の有無が不統一
3. `startMs`/`endMs`が活用されていない

#### 理想的なフロー

```typescript
// 1. ASR結果の受信
class TranscriptService {
  handleASRResult(result: DeepgramResult): TranscriptSegment {
    return {
      id: generateId('seg'),
      text: result.text,
      language: result.language || this.detectLanguage(result.text),
      timestamp: Date.now(),
      startMs: result.startMs,
      endMs: result.endMs,
      confidence: result.confidence,
      isFinal: result.isFinal
    };
  }
}

// 2. 文単位の結合（翻訳とは独立）
class SentenceCombinerService {
  combine(segments: TranscriptSegment[]): CombinedSentence {
    const avgConfidence = segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length;
    
    return {
      id: generateId('combined'),
      segmentIds: segments.map(s => s.id),
      sourceText: segments.map(s => s.text).join(' '),
      sourceLanguage: segments[0].language,
      startTime: segments[0].timestamp,
      endTime: segments[segments.length - 1].timestamp,
      segmentCount: segments.length,
      averageConfidence: avgConfidence
    };
  }
}

// 3. 翻訳（別責任）
class TranslationService {
  async translate(source: CombinedSentence | TranscriptSegment): Promise<Translation> {
    const sourceText = 'sourceText' in source ? source.sourceText : source.text;
    const sourceLanguage = 'sourceLanguage' in source ? source.sourceLanguage : source.language;
    
    const startTime = Date.now();
    const translated = await this.llm.translate(sourceText, sourceLanguage, this.targetLanguage);
    
    return {
      id: generateId('trans'),
      sourceId: source.id,
      sourceText: sourceText,
      sourceLanguage: sourceLanguage,
      targetText: translated,
      targetLanguage: this.targetLanguage,
      timestamp: Date.now(),
      model: this.model,
      quality: this.quality,
      processingTimeMs: Date.now() - startTime
    };
  }
}
```

### 4. 実装手順

#### Phase 1: 型定義の統一と責任分離
1. `src/domain/models/Transcript.ts`を理想的な型定義に更新
2. `Translation`型を別ファイルに分離
3. `CombinedSentence`型を独立させる

#### Phase 2: サービス層の整理
1. TranscriptServiceの作成（ASR結果の処理）
2. TranslationServiceの独立（翻訳責任の分離）
3. SentenceCombinerの責任明確化

#### Phase 3: データストアの最適化
1. TranscriptStore（生データ保存）
2. TranslationStore（翻訳結果保存）
3. HistoryStore（表示用データ）

### 5. 移行戦略

#### Step 1: 新型定義の作成（既存コードに影響なし）
```bash
# 新しいドメインモデルを作成
src/domain/models/
  ├── Transcript.ts      # 更新
  ├── Translation.ts     # 新規
  ├── CombinedSentence.ts # 新規
  └── index.ts          # エクスポート
```

#### Step 2: アダプター層の実装
```typescript
// 既存コードとの互換性を保つアダプター
export class TranscriptAdapter {
  static toOldFormat(segment: TranscriptSegment): OldTranscriptSegment {
    return {
      id: segment.id,
      text: segment.text,
      timestamp: segment.timestamp,
      confidence: segment.confidence,
      isFinal: segment.isFinal
    };
  }
  
  static fromOldFormat(old: OldTranscriptSegment): TranscriptSegment {
    return {
      ...old,
      language: 'unknown',
      startMs: 0,
      endMs: 0
    };
  }
}
```

#### Step 3: 段階的移行
1. 新しい型定義を使用する新規コードから開始
2. 既存コードはアダプター経由で移行
3. 全移行後にアダプターを削除

### 6. メリット

1. **責任の明確化**: 各モデルが単一の責任を持つ
2. **拡張性**: 新機能（話者分離等）の追加が容易
3. **テスタビリティ**: 各層が独立してテスト可能
4. **型安全性**: 完全な型定義による実行時エラーの削減
5. **パフォーマンス**: 不要なプロパティの削除

### 7. 実装優先順位

1. **高**: TranscriptSegmentの統一（現在の不整合を解消）
2. **中**: Translation型の分離（source/target問題の解決）
3. **低**: 完全な理想形への移行（段階的に実施）

---

このアーキテクチャにより、UniVoice 2.0は真のClean Architectureを実現します。