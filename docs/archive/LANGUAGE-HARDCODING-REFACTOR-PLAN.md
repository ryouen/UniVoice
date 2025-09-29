# Language Hardcoding Refactoring Plan
*作成日: 2025-09-10*

## 🔴 現状の問題

UniVoice 2.0は現在、english/japaneseフィールドがハードコードされており、真の多言語対応ができていません。

## 📊 影響範囲

### 1. バックエンド
- `AdvancedFeatureService`: 354箇所のenglish/japanese参照
- `UnifiedPipelineService`: 複数の型定義
- `DataPersistenceService`: ストレージスキーマ
- IPC契約: `SummaryEventSchema`, `ProgressiveSummaryEventSchema`

### 2. フロントエンド
- `UniVoice.tsx`: 状態管理とUI表示
- `useUnifiedPipeline.ts`: フックの型定義
- `ProgressiveSummarySection.tsx`: 要約表示UI
- モーダルコンポーネント

### 3. 通信層
- IPCイベント定義
- 型契約

## 🎯 リファクタリング計画

### Phase 1: 型定義の更新
```typescript
// Before
interface Summary {
  english: string;
  japanese: string;
}

// After
interface Summary {
  sourceText: string;
  targetText: string;
  sourceLanguage: string;
  targetLanguage: string;
}
```

### Phase 2: サービス層の更新
1. AdvancedFeatureServiceの分割
2. 言語動的対応の実装

### Phase 3: UI層の更新
1. 動的フィールド名の使用
2. 言語ラベルの動的生成

## 🏗️ AdvancedFeatureService分割案

### 現在の問題
- 責任が多すぎる（要約、語彙、レポート、翻訳）
- 1000行近い巨大クラス
- 単一責任原則違反

### 提案する新アーキテクチャ

```
services/
├── content/
│   ├── SummaryService.ts          # 要約専門
│   ├── VocabularyService.ts       # 語彙抽出専門
│   ├── ReportGenerationService.ts # レポート生成専門
│   └── ContentAggregatorService.ts # 調整役
└── translation/
    └── TranslationService.ts      # 翻訳専門（既存）
```

### 各サービスの責任

#### SummaryService
- 進捗的要約（400/800/1600/2400語）
- 定期要約（10分ごと）
- 最終要約

#### VocabularyService
- 専門用語の抽出
- 用語の定義生成
- 用語リストの管理

#### ReportGenerationService
- 最終レポートの生成
- Markdown形式での出力
- エクスポート機能

#### ContentAggregatorService
- 各サービスの調整
- イベントの集約と配信
- 状態管理

## 🚀 実装手順

1. **動作確認** - 現在の要約機能が正常に動作することを確認
2. **型定義の作成** - 新しいインターフェースを定義
3. **段階的移行** - 一つずつサービスを分離
4. **テスト** - 各段階でのテスト実施
5. **旧コードの削除** - 完全移行後に削除

## 🎌 多言語対応の改善

### 現在
- ソース言語 = 英語固定
- ターゲット言語 = 日本語固定

### 改善後
- ソース言語 = ユーザー選択
- ターゲット言語 = ユーザー選択
- UIラベルも動的に変更

## 📋 チェックリスト

- [ ] 要約機能の動作確認
- [ ] 型定義の作成
- [ ] SummaryService の実装
- [ ] VocabularyService の実装
- [ ] ReportGenerationService の実装
- [ ] ContentAggregatorService の実装
- [ ] フロントエンドの更新
- [ ] テストの実装
- [ ] ドキュメントの更新

## 🔗 関連ドキュメント

- [ARCHITECTURE.md](./ARCHITECTURE.md) - アーキテクチャ設計
- [API-CONTRACTS.md](./API-CONTRACTS.md) - API契約

---
*この計画は段階的に実施し、各ステップで動作確認を行います。*