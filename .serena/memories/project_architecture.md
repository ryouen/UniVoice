# UniVoice 2.0 アーキテクチャ詳細

## アーキテクチャパターン
- **Clean Architecture**: 依存性の方向を内側に保つ
- **CQRS**: コマンドとクエリの完全分離
- **Event-Driven**: UI層と処理層の疎結合
- **Hexagonal**: ポートとアダプタによる外部依存の分離

## ディレクトリ構造

```
UniVoice/
├── electron/                 # Electronメインプロセス（バックエンド）
│   ├── main.ts              # エントリーポイント
│   ├── preload.ts           # プリロードスクリプト
│   ├── services/
│   │   ├── domain/          # ドメインサービス層
│   │   │   ├── UnifiedPipelineService.ts    # メインパイプライン
│   │   │   ├── AdvancedFeatureService.ts    # 要約・語彙・レポート
│   │   │   ├── StreamCoalescer.ts           # UI更新最適化
│   │   │   ├── SegmentManager.ts            # セグメント重複除去
│   │   │   ├── SessionService.ts            # セッション管理
│   │   │   └── LanguageConfig.ts            # 言語設定
│   │   ├── ipc/             # IPC通信層
│   │   │   ├── contracts.ts # 型定義（Zodスキーマ）
│   │   │   └── gateway.ts   # IPCゲートウェイ（BFF）
│   │   └── adapters/        # 外部サービスアダプタ
│   │       └── monitoring/  # モニタリング
│   └── utils/
│       └── logger.ts        # ログユーティリティ
│
├── src/                     # Reactフロントエンド
│   ├── components/
│   │   ├── UniVoicePerfect.tsx      # メインUI（旧名、要リネーム）
│   │   ├── UniVoiceEnhanced.tsx    # 拡張UI
│   │   └── UniVoice/                # UIコンポーネント群
│   │       ├── UniVoiceContainer.tsx
│   │       ├── SetupScreen.tsx      # 初期設定画面
│   │       ├── TranslationDisplay.tsx
│   │       └── HistorySection.tsx   # 履歴表示
│   ├── hooks/                       # カスタムフック
│   │   ├── useUnifiedPipeline.ts    # 基本機能フック
│   │   ├── useSession.ts            # セッション管理
│   │   └── useSessionMemory.ts      # メモリ管理
│   ├── utils/                       # ユーティリティ
│   │   ├── RealtimeDisplayManager.ts    # 3行表示管理
│   │   ├── IncrementalTextManager.ts    # テキスト更新
│   │   ├── StreamBatcher.ts            # ストリームバッチ処理
│   │   └── SessionMemoryManager.ts     # セッションメモリ
│   ├── domain/                      # ドメインロジック
│   │   ├── Result.ts                # Result型定義
│   │   └── services/
│   │       └── SessionMemoryService.ts
│   └── shared/types/                # 共有型定義
│       └── contracts.ts             # IPC契約型
│
└── tests/                           # テスト
    ├── unit/                        # 単体テスト
    ├── integration/                 # 統合テスト
    ├── performance/                 # パフォーマンステスト
    └── e2e/                         # E2Eテスト
```

## 重要なサービスと役割

### 1. UnifiedPipelineService（メインパイプライン）
- 音声認識から翻訳までの全体フロー制御
- Deepgram WebSocket接続管理
- OpenAI API呼び出し
- 翻訳キューの並列処理（maxConcurrency制御）

### 2. AdvancedFeatureService（高度機能）
- 段階的要約（400/800/1600語、以降800語ごと）
- 単語帳生成（5-10語）
- 最終レポート生成（Markdown形式）

### 3. StreamCoalescer（UI最適化）
- UI更新頻度を50%以上削減
- デバウンス: 160ms
- 強制コミット: 1100ms
- テキストの差分更新管理

### 4. SegmentManager（セグメント管理）
- 重複除去
- セグメントのマージ
- 履歴管理

## 型安全性の仕組み

### Zodによる型検証
```typescript
// IPC契約の定義例
const StartSessionCommand = z.object({
  type: z.literal('start-session'),
  payload: z.object({
    audioConfig: AudioConfigSchema,
    deepgramConfig: DeepgramConfigSchema,
    openaiConfig: OpenAIConfigSchema
  })
});
```

### Discriminated Union型
- 全てのIPCイベントは`type`フィールドで識別
- 型安全なイベントハンドリング

## パフォーマンス最適化

### StreamCoalescer
- テキスト更新のバッチ処理
- 不要な再レンダリング防止
- 差分検出による効率的な更新

### 並列処理
- 翻訳リクエストの並列実行（デフォルト3並列）
- 非同期キュー処理

### メモリ管理
- セグメントの適切な破棄
- メモリリークの防止

## 重要な設定値（環境変数）

```bash
# StreamCoalescer設定
STREAM_COALESCER_DEBOUNCE_MS=160
STREAM_COALESCER_FORCE_COMMIT_MS=1100

# Deepgram設定
DG_ENDPOINTING=800
DG_UTTERANCE_END_MS=1000
DG_INTERIM=true

# 並列処理設定
MAX_TRANSLATION_CONCURRENCY=3
```