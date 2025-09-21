# useTranslationQueue フック設計計画書

## 作成日: 2025-09-21
## 作成者: Senior Engineer (YAGNI原則・Clean Architecture準拠)

## 1. 現状分析

### 問題点
- useUnifiedPipeline.ts内に翻訳キュー管理ロジックが埋め込まれている
- 翻訳イベント処理が複雑に絡み合っている（約170行）
- 高品質翻訳とリアルタイム翻訳の処理が混在
- テストが困難で、再利用性が低い

### 現在の実装構造
```typescript
// 翻訳イベント処理（514-710行）
case 'translation':
  - 履歴用高品質翻訳の処理
  - パラグラフ翻訳の処理
  - 通常翻訳の処理
  - セグメントマップの管理
  - 履歴ブロックの更新

// 関連する状態管理
- segmentTranslationMap: セグメントと翻訳の対応
- highQualityTranslationsRef: 高品質翻訳の保存
- segmentToCombinedMap: セグメントとCombinedIDの対応
- paragraphTranslationMap: パラグラフ翻訳の管理
```

### 依存関係
- StreamBatcher: 翻訳ストリーミングのバッチ処理
- FlexibleHistoryGrouper: 履歴ブロックの更新
- SessionMemoryService: 翻訳データの更新
- TranslationQueueManager (electron側): 優先度付きキュー管理

## 2. 設計方針

### YAGNI原則の適用
- 現在必要な翻訳キュー管理機能のみを実装
- 将来の翻訳エンジンの切り替えは考慮しない
- シンプルで理解しやすいインターフェース

### Clean Architecture準拠
- 翻訳処理ロジックとUI状態管理の分離
- 依存性の注入によるテスタビリティの確保
- 単一責任の原則の遵守

## 3. インターフェース設計

```typescript
// src/hooks/useTranslationQueue.ts

interface UseTranslationQueueOptions {
  enabled?: boolean;  // フックの有効/無効
  onTranslationComplete?: (segmentId: string, translation: string) => void;
  onHighQualityTranslation?: (id: string, translation: string, isParagraph: boolean) => void;
  onError?: (error: Error) => void;
  streamBatchConfig?: {
    minInterval?: number;
    maxWait?: number;
    minChars?: number;
  };
}

interface TranslationSegment {
  id: string;
  original: string;
  translation: string;
  timestamp: number;
  isHighQuality?: boolean;
  isParagraph?: boolean;
}

interface UseTranslationQueueReturn {
  // 状態
  activeTranslations: Map<string, TranslationSegment>;
  highQualityTranslations: Map<string, string>;
  
  // Stream処理
  streamBatcher: StreamBatcher | null;
  
  // イベントハンドラー
  handleTranslationEvent: (event: PipelineEvent) => void;
  
  // 制御関数
  clearTranslations: () => void;
  resetBatcher: () => void;
  
  // マッピング管理
  registerSegmentMapping: (segmentId: string, combinedId: string) => void;
  registerParagraphMapping: (paragraphId: string, data: any) => void;
}
```

## 4. 実装計画

### フェーズ1: フック作成と基本構造
1. `src/hooks/useTranslationQueue.ts`を新規作成
2. 型定義とインターフェースの実装
3. StreamBatcher初期化ロジックの実装

### フェーズ2: 翻訳イベント処理の移植
1. 翻訳イベントハンドラーの抽出
2. 高品質翻訳処理の実装
3. パラグラフ翻訳処理の実装
4. 通常翻訳処理の実装

### フェーズ3: useUnifiedPipelineとの統合
1. useTranslationQueueの使用
2. 既存の翻訳処理コードの削除
3. 動作確認とデバッグ

## 5. 技術的詳細

### 責任範囲
- 翻訳イベントの処理と振り分け
- 高品質翻訳とリアルタイム翻訳の管理
- StreamBatcherによるストリーミング最適化
- セグメントと翻訳のマッピング管理
- 履歴ブロックの更新トリガー

### 内部状態管理
- activeTranslations: アクティブな翻訳のMap
- highQualityTranslations: 高品質翻訳の保存
- segmentMappings: セグメントIDとCombinedIDの対応
- paragraphMappings: パラグラフ翻訳の管理

### エラーハンドリング
- 無効な翻訳イベントの処理
- StreamBatcher初期化失敗時の処理
- マッピング不整合の検出

## 6. 期待される効果

### 即座の効果
- コードの可読性向上（useUnifiedPipelineが約170行削減見込み）
- 翻訳処理ロジックの独立性確保
- テスタビリティの向上

### 将来的な効果
- 翻訳機能の独立したテストが可能
- 異なるUIコンポーネントでの再利用
- 翻訳処理の拡張や最適化が容易

## 7. 実装チェックリスト

- [ ] useTranslationQueue.tsの作成
- [ ] 型定義とインターフェースの実装
- [ ] StreamBatcher初期化ロジックの実装
- [ ] 翻訳イベントハンドラーの実装
- [ ] 高品質翻訳処理の実装
- [ ] パラグラフ翻訳処理の実装
- [ ] セグメントマッピング管理の実装
- [ ] useUnifiedPipelineへの統合
- [ ] 既存コードの削除とクリーンアップ
- [ ] 動作確認とデバッグ
- [ ] ドキュメントの更新

## 8. リスクと対策

### リスク
- 履歴更新ロジックとの連携が複雑
- SessionMemoryServiceとの整合性
- 翻訳タイミングの管理

### 対策
- 段階的な移行と十分なテスト
- 既存のロジックを忠実に移植
- デバッグログによる動作確認

## 9. 実装の注意点

### 状態の一貫性
- segmentTranslationMapとhighQualityTranslationsの同期
- 履歴ブロック更新のタイミング
- StreamBatcherとdisplayManagerの連携

### パフォーマンス考慮
- Map操作の効率性
- 不要なレンダリングの回避
- メモリリークの防止

---

この設計に基づいて実装を進めることで、翻訳処理の責任を明確に分離し、保守性とテスタビリティを向上させます。