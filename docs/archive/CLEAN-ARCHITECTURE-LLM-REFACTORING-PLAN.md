# Clean Architecture LLMリファクタリング計画

作成日: 2025-08-28
作成者: Claude (Ultrathink Mode)

## 🔴 絶対規範（CRITICAL RULES）

### 動作実績のあるモデル設定を絶対に変更しない

#### ⚠️ 重要な前提
1. **GPT-5シリーズは実在する**（2025年8月現在）
   - gpt-5-nano, gpt-5-mini, gpt-5 は全て実在のモデル
   - 「GPT-4に戻す」などの変更は絶対禁止

2. **Responses APIは実在する**（2025年3月リリース）
   - `openai.responses.create` が正しいAPI
   - `chat.completions.create` は旧式API（使用禁止）

#### 現在の動作確認済み実装

```typescript
// ✅ 正しい実装例（UnifiedPipelineService.tsより）
const stream = await this.openai.responses.create({
  model: 'gpt-5-nano',  // 翻訳用
  input: [
    { role: 'system', content: translationPrompt },
    { role: 'user', content: text }
  ],
  max_output_tokens: 1500,
  stream: true,
  reasoning: { effort: 'minimal' },
  temperature: 1.0  // GPT-5では固定
});

// ❌ 間違った実装（絶対に使用禁止）
const response = await this.openai.chat.completions.create({
  model: 'gpt-4',  // ダウングレード禁止！
  messages: [...],  // inputではなくmessages
  max_tokens: 1500  // max_output_tokensではない
});
```

#### 動作確認済みの設定

1. **Deepgram設定**
   - モデル: `nova-3` → **変更禁止**
   - パラメータ: 現在の設定を維持

2. **OpenAI GPT-5シリーズ**
   - 翻訳: `gpt-5-nano` → **変更禁止**
   - 要約: `gpt-5-mini` → **変更禁止**
   - レポート: `gpt-5` → **変更禁止**
   - API: `responses.create` → **変更禁止**

3. **実装時の必須確認事項**
   - ✅ モデル名が変更されていないか
   - ✅ responses.createが使用されているか
   - ✅ inputパラメータが使用されているか
   - ✅ max_output_tokensが使用されているか
   - ✅ テストが全て通過するか

**理由**: 現在の設定は本番環境で動作確認済み。勝手な「改善」は動作不良の原因となる。

## 🎯 目的

UnifiedPipelineService (900行) を Clean Architecture の原則に従って分割し、特に **LLM関連処理を一元化** して将来の技術変更に備える。ただし、**現在動作しているモデル設定は一切変更しない**。

## 🏗️ 現状分析

### 問題点
1. **LLM呼び出しの分散**: OpenAI API呼び出しが複数箇所に散在
2. **責任の混在**: オーケストレーション、翻訳、要約、履歴管理が1ファイルに
3. **将来性の欠如**: GPT-6への移行時に複数ファイルの変更が必要
4. **テストの困難さ**: 900行のファイルは単体テストが困難

### 現在のLLM使用箇所
- 翻訳: gpt-5-nano (リアルタイム性重視)
- 要約: gpt-5-mini (バランス型)  
- 語彙抽出: gpt-5-mini
- 最終レポート: gpt-5 + high reasoning
- ユーザー入力翻訳: gpt-5-nano

## 🎨 提案アーキテクチャ

```
UniVoice/
├── domain/                           # ビジネスルール
│   ├── entities/
│   │   ├── Transcript.ts            # 音声認識結果
│   │   ├── Translation.ts           # 翻訳結果
│   │   └── Summary.ts               # 要約結果
│   └── services/
│       └── ContentAnalyzer.ts       # コンテンツ分析ロジック
│
├── application/                     # アプリケーション層
│   └── AudioPipelineOrchestrator.ts # 全体フロー調整（150行目標）
│
├── infrastructure/                  # インフラ層
│   ├── llm/
│   │   ├── LLMGateway.ts           # LLM統一インターフェース ⭐新規
│   │   ├── PromptManager.ts        # プロンプト管理 ⭐新規
│   │   └── ModelConfigManager.ts   # モデル設定管理 ⭐新規
│   ├── audio/
│   │   ├── DeepgramStreamAdapter.ts # ✅実装済み
│   │   └── TranscriptionService.ts  # 音声認識調整
│   └── persistence/
│       └── HistoryRepository.ts     # 履歴永続化
│
└── services/                        # ドメインサービス
    ├── ContentProcessingService.ts  # LLM処理統合 ⭐新規
    └── HistoryManager.ts           # 履歴管理
```

## 📋 実装計画（優先順位順）

### Phase 1: LLM基盤整備 【最優先】

#### 1.1 LLMGateway の実装
**目的**: すべてのLLM通信を一元化
```typescript
interface LLMGateway {
  // 汎用的なLLM呼び出しインターフェース
  complete(request: LLMRequest): Promise<LLMResponse>;
  stream(request: LLMRequest): AsyncIterable<LLMStreamChunk>;
  
  // モデル切り替え（将来のGPT-6対応）
  setModel(purpose: LLMPurpose, model: string): void;
}

enum LLMPurpose {
  TRANSLATION = 'translation',
  SUMMARY = 'summary',
  VOCABULARY = 'vocabulary',
  REPORT = 'report'
}
```

**メリット**:
- GPT-6への移行は `ModelConfigManager` の設定変更のみ
- レート制限、エラーハンドリング、リトライを一元管理
- モックが容易でテスタブル

#### 1.2 PromptManager の実装
**目的**: プロンプトの一元管理
```typescript
interface PromptManager {
  getPrompt(purpose: LLMPurpose, params: PromptParams): string;
  updatePrompt(purpose: LLMPurpose, template: string): void;
}
```

### Phase 2: ContentProcessingService の実装

**目的**: すべてのLLM処理を統合
```typescript
class ContentProcessingService {
  constructor(
    private llmGateway: LLMGateway,
    private promptManager: PromptManager
  ) {}
  
  // 統一されたインターフェース
  async translateText(text: string, from: Lang, to: Lang): Promise<Translation>
  async generateSummary(segments: Segment[], wordCount: number): Promise<Summary>
  async extractVocabulary(content: string): Promise<Vocabulary[]>
  async generateReport(session: Session): Promise<Report>
}
```

### Phase 3: AudioPipelineOrchestrator へのリファクタリング

**目的**: UnifiedPipelineService から純粋なオーケストレーション部分を抽出
- 各サービスの呼び出し順序管理
- イベントの配信
- エラーハンドリングの調整
- **目標: 150行以下**

### Phase 4: 周辺サービスの抽出

#### 4.1 TranscriptionService
- DeepgramStreamAdapter のラッパー
- 音声認識結果の正規化

#### 4.2 HistoryManager  
- セグメント管理
- 履歴の保存/取得
- 履歴用の翻訳リクエスト

## 🎯 成功指標

### コード品質
- [ ] 各ファイル300行以下
- [ ] LLM呼び出しがLLMGateway経由のみ
- [ ] 単体テストカバレッジ80%以上

### 保守性
- [ ] GPT-6移行が設定変更のみで可能
- [ ] 新しいLLM機能追加が1箇所の変更で可能
- [ ] プロンプト変更がコード変更なしで可能

### パフォーマンス
- [ ] リファクタリング前後で性能劣化なし
- [ ] 初期表示1000ms以下を維持

## 🚀 実装順序とタイムライン

### Week 1: LLM基盤（Phase 1）
1. LLMGateway インターフェース設計
2. ModelConfigManager 実装
3. PromptManager 実装
4. LLMGateway 実装とテスト

### Week 2: サービス統合（Phase 2）
1. ContentProcessingService 設計
2. 既存のLLM呼び出しを移行
3. 統合テスト

### Week 3: リファクタリング（Phase 3-4）
1. AudioPipelineOrchestrator 抽出
2. TranscriptionService 抽出
3. HistoryManager 抽出
4. 全体統合テスト

## 📊 リスク管理

### リスク1: 既存機能の破壊
**対策**: 
- 段階的移行
- 既存テストの維持
- Feature Flagでの切り替え

### リスク2: パフォーマンス劣化
**対策**:
- ベンチマークの継続実施
- 非同期処理の最適化

### リスク3: 過度の抽象化
**対策**:
- YAGNI原則の遵守
- 実際の要件に基づく設計

## 🎓 設計原則

### Single Responsibility Principle
- LLMGateway: LLM通信のみ
- ContentProcessingService: コンテンツ処理のみ
- AudioPipelineOrchestrator: フロー調整のみ

### Open/Closed Principle
- 新しいLLMモデルの追加は拡張で対応
- 既存コードの変更を最小化

### Dependency Inversion
- 上位モジュールはLLMGatewayインターフェースに依存
- 具体的なOpenAI実装には依存しない

## 結論

このリファクタリング計画により：
1. **LLM処理が完全に一元化** され、GPT-6移行が容易
2. **各コンポーネントが単一責任** を持ち、テスタブル
3. **将来の拡張が容易** な設計

最優先はLLMGatewayの実装です。これにより、すべての後続作業が簡潔になります。