# useRealtimeTranscription フック設計計画書

## 作成日: 2025-09-21
## 作成者: Senior Engineer (YAGNI原則・Clean Architecture準拠)

## 1. 現状分析

### 問題点
- useUnifiedPipeline.ts内にASR（自動音声認識）イベント処理が埋め込まれている（約70行）
- 翻訳タイムアウト管理ロジックも含まれている（約47行）
- リアルタイム文字起こしの表示管理が複雑に絡み合っている
- テストが困難で、再利用性が低い

### 現在の実装構造
```typescript
// ASRイベント処理（568-627行）
case 'asr':
  - デバッグログ出力
  - displayManagerRef.currentの更新
  - segmentTranslationMapへの登録
  - translationTimeoutManagerの開始
  - originalTextManagerの更新

// 翻訳タイムアウトハンドラー（488-535行）
const handleTranslationTimeout = useCallback((segmentId) => {
  - displayManagerの更新
  - 履歴への追加
  - historyGrouperへの追加
  - クリーンアップ
});
```

### 依存関係
- SyncedRealtimeDisplayManager: リアルタイム表示の同期管理
- IncrementalTextManager: テキストの増分更新管理
- TranslationTimeoutManager: 翻訳タイムアウト管理
- FlexibleHistoryGrouper: 履歴のグループ化

## 2. 設計方針

### YAGNI原則の適用
- 現在必要なASRイベント処理機能のみを実装
- 将来の音声認識エンジンの切り替えは考慮しない
- シンプルで理解しやすいインターフェース

### Clean Architecture準拠
- ビジネスロジックとUI状態管理の分離
- 依存性の注入によるテスタビリティの確保
- 単一責任の原則の遵守

## 3. インターフェース設計

```typescript
// src/hooks/useRealtimeTranscription.ts

interface UseRealtimeTranscriptionOptions {
  enabled?: boolean;  // フックの有効/無効
  onTranscriptionUpdate?: (text: string, isFinal: boolean, segmentId: string) => void;
  onSegmentComplete?: (segmentId: string, text: string) => void;
  onTranslationTimeout?: (segmentId: string, originalText: string) => void;
  onError?: (error: Error) => void;
  translationTimeoutMs?: number;  // デフォルト: 7000ms
}

interface UseRealtimeTranscriptionReturn {
  // 状態
  currentTranscription: string;  // 現在の文字起こしテキスト
  pendingSegments: Map<string, SegmentInfo>;  // 翻訳待ちセグメント
  
  // 表示管理
  displayManager: SyncedRealtimeDisplayManager | null;
  textManager: IncrementalTextManager | null;
  
  // イベントハンドラー
  handleASREvent: (event: PipelineEvent) => void;
  
  // 制御関数
  clearTranscription: () => void;
  resetManagers: () => void;
}

interface SegmentInfo {
  id: string;
  originalText: string;
  timestamp: number;
  isFinal: boolean;
}
```

## 4. 実装計画

### フェーズ1: フック作成と基本構造
1. `src/hooks/useRealtimeTranscription.ts`を新規作成
2. 型定義とインターフェースの実装
3. Manager初期化ロジックの実装

### フェーズ2: ASRイベント処理の移植
1. ASRイベントハンドラーの抽出
2. displayManagerとtextManagerの更新ロジック
3. セグメント管理とタイムアウト処理

### フェーズ3: useUnifiedPipelineとの統合
1. useRealtimeTranscriptionの使用
2. 既存のASR処理コードの削除
3. 動作確認とデバッグ

## 5. 技術的詳細

### 責任範囲
- ASR（音声認識）イベントの処理
- リアルタイム文字起こし表示の管理
- セグメント管理と翻訳待ち状態の追跡
- 翻訳タイムアウトの検出と処理
- 表示マネージャーの初期化と管理

### 内部状態管理
- currentTranscription: 現在表示中の文字起こし
- pendingSegments: 翻訳待ちセグメントのMap
- displayManager/textManager: 表示管理インスタンス

### エラーハンドリング
- Manager初期化失敗時の処理
- 無効なイベントデータの処理
- タイムアウト処理でのエラー

## 6. 期待される効果

### 即座の効果
- コードの可読性向上（useUnifiedPipelineが約117行削減見込み）
- ASR処理ロジックの独立性確保
- テスタビリティの向上

### 将来的な効果
- 音声認識機能の独立したテストが可能
- 異なるUIコンポーネントでの再利用
- ASR処理の拡張や最適化が容易

## 7. 実装チェックリスト

- [ ] useRealtimeTranscription.tsの作成
- [ ] 型定義とインターフェースの実装
- [ ] Manager初期化ロジックの実装
- [ ] ASRイベントハンドラーの実装
- [ ] セグメント管理とタイムアウト処理
- [ ] 翻訳タイムアウトハンドラーの実装
- [ ] useUnifiedPipelineへの統合
- [ ] 既存コードの削除とクリーンアップ
- [ ] 動作確認とデバッグ
- [ ] ドキュメントの更新

## 8. リスクと対策

### リスク
- displayManagerとhistoryGrouperの連携が複雑
- 既存の状態管理との整合性
- パフォーマンスへの影響

### 対策
- 段階的な移行と十分なテスト
- 既存のロジックを忠実に移植
- デバッグログによる動作確認

## 9. 実装の注意点

### 状態の一貫性
- segmentTranslationMapとdisplayManagerの同期
- addedToHistorySetによる重複防止
- タイムアウト処理とクリーンアップの順序

### パフォーマンス考慮
- 不要なレンダリングの回避
- Map/Setの適切な使用
- メモリリークの防止

---

この設計に基づいて実装を進めることで、ASR処理の責任を明確に分離し、保守性とテスタビリティを向上させます。