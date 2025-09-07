# UniVoice 2.0 リファクタリング提案

## 🔴 現状の問題点

### 1. ファイルサイズが大きすぎる
- **UniVoicePerfect.tsx**: 1800行以上（UI、ロジック、状態管理が混在）
- **useUnifiedPipeline.ts**: 835行（フック、イベント処理、音声処理が混在）
- **UnifiedPipelineService.ts**: 782行（ドメインロジック、外部API、イベント処理が混在）

### 2. 責任の混在による単純ミス
- イベント名の不一致（camelCase vs kebab-case）
- 必要な処理のコメントアウト忘れ
- イベント転送の実装忘れ
- 重複処理の見落とし

### 3. 認知負荷の高さ
- 1つのファイルに多くの責任が混在
- 変更の影響範囲が見えにくい
- デバッグが困難

## 🎯 提案する新アーキテクチャ

### 1. コンポーネントの分割（UniVoicePerfect.tsx → 複数の小さなコンポーネント）

```
src/components/
├── UniVoice/
│   ├── UniVoice.tsx                  # メインコンテナ（200行以下）
│   ├── sections/
│   │   ├── SetupSection.tsx          # 初期設定画面
│   │   ├── HistorySection.tsx        # 履歴表示
│   │   ├── RealtimeSection.tsx       # リアルタイム表示
│   │   ├── SummarySection.tsx        # 要約表示
│   │   └── QuestionSection.tsx       # 質問・メモ
│   ├── controls/
│   │   ├── SessionControls.tsx       # 録音制御
│   │   ├── ExportControls.tsx        # エクスポート機能
│   │   └── SettingsControls.tsx      # 設定
│   └── modals/
│       ├── HistoryModal.tsx          # 履歴詳細モーダル
│       ├── VocabularyModal.tsx       # 単語帳モーダル
│       └── ReportModal.tsx           # 最終レポート
```

### 2. フックの分割（useUnifiedPipeline.ts → 責任別の小さなフック）

```
src/hooks/
├── pipeline/
│   ├── usePipelineCore.ts           # コア機能のみ（100行以下）
│   ├── usePipelineEvents.ts         # イベント処理
│   ├── usePipelineAudio.ts          # 音声処理
│   └── usePipelineState.ts          # 状態管理
├── ui/
│   ├── useResize.ts                 # リサイズ機能
│   ├── useKeyboardShortcuts.ts      # キーボード操作
│   └── useAutoSave.ts               # 自動保存
└── index.ts                          # 統合エクスポート
```

### 3. サービスの分割（UnifiedPipelineService.ts → ドメイン別サービス）

```
electron/services/domain/
├── pipeline/
│   ├── PipelineOrchestrator.ts      # 統合管理（200行以下）
│   ├── ASRService.ts                # 音声認識
│   ├── TranslationService.ts        # 翻訳
│   └── EventCoordinator.ts          # イベント調整
├── adapters/
│   ├── DeepgramAdapter.ts           # Deepgram統合
│   └── OpenAIAdapter.ts             # OpenAI統合
└── index.ts
```

### 4. イベント契約の明確化

```typescript
// src/shared/events/contracts.ts
export const EVENT_CHANNELS = {
  // 一元管理された定数
  CURRENT_ORIGINAL_UPDATE: 'current-original-update',
  CURRENT_TRANSLATION_UPDATE: 'current-translation-update',
  TRANSLATION_COMPLETE: 'translation-complete',
  // ...
} as const;

// 型安全なイベントエミッター
export class TypedEventEmitter<T extends Record<string, any>> {
  // 実装
}
```

## 📊 期待される効果

### 1. 認知負荷の削減
- 各ファイル200行以下に制限
- 単一責任の原則を徹底
- 見通しの良いコード

### 2. バグの削減
- イベント名の一元管理
- 型安全性の向上
- テスタビリティの向上

### 3. 保守性の向上
- 変更の影響範囲が明確
- デバッグが容易
- 新機能追加が簡単

## 🚀 実装計画

### Phase 1: イベント契約の統一（1日）
1. EVENT_CHANNELS定数の作成
2. 全てのイベント名を定数に置き換え
3. TypedEventEmitterの実装

### Phase 2: コンポーネント分割（2日）
1. UniVoicePerfect.tsxを責任別に分割
2. 共通UIロジックの抽出
3. props/stateの整理

### Phase 3: フック分割（1日）
1. useUnifiedPipelineを責任別に分割
2. カスタムフックの作成
3. 統合フックの作成

### Phase 4: サービス分割（2日）
1. UnifiedPipelineServiceを分割
2. アダプタパターンの実装
3. 統合テスト

## ⚠️ リスクと対策

### リスク
1. 既存機能の破壊
2. パフォーマンス劣化
3. 複雑性の増加

### 対策
1. 段階的な移行
2. 包括的なテスト
3. パフォーマンス計測
4. ドキュメント充実

## 結論

現在の巨大なファイルは、単純ミスの温床となっています。Clean Architectureに基づいた責任分解により、より保守性が高く、バグの少ないコードベースを実現できます。