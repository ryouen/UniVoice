# UniVoice 2.0 コードベース構造

## ディレクトリ構成
```
UniVoice/
├── electron/                       # Electronバックエンド
│   ├── main.ts                    # メインプロセス
│   ├── preload.ts                 # プリロードスクリプト
│   ├── main/                      
│   │   ├── WindowRegistry.ts      # ウィンドウ管理
│   │   └── BoundsStore.ts        # ウィンドウサイズ永続化
│   └── services/
│       ├── domain/                # ドメインロジック
│       │   ├── UnifiedPipelineService.ts  # 中央制御
│       │   ├── AdvancedFeatureService.ts  # 要約・語彙・レポート
│       │   ├── SentenceCombiner.ts        # 文単位結合
│       │   ├── TranslationQueueManager.ts # 優先度制御
│       │   ├── SegmentManager.ts          # セグメント管理
│       │   ├── StreamCoalescer.ts         # UI最適化
│       │   ├── ParagraphBuilder.ts        # パラグラフ形成
│       │   ├── LanguageConfig.ts          # 言語設定
│       │   ├── DataPersistenceService.ts  # データ永続化
│       │   └── SessionService.ts          # セッション管理
│       ├── adapters/              # 外部サービス連携
│       │   ├── DeepgramStreamAdapter.ts   # Deepgram連携
│       │   └── OpenAIAdapter.ts           # OpenAI連携
│       ├── ipc/                   # IPC通信層
│       │   ├── contracts.ts      # 型定義・契約
│       │   └── gateway.ts         # IPCゲートウェイ
│       └── monitoring/            # 監視・計測
│
├── src/                           # Reactフロントエンド
│   ├── components/
│   │   ├── UniVoice.tsx          # メインコンポーネント
│   │   ├── SetupScreen.tsx       # Setup画面（削除対象）
│   │   └── UnifiedHistoryRenderer-Flow.tsx
│   ├── hooks/
│   │   ├── useUnifiedPipeline.ts # パイプライン接続
│   │   └── useAdvancedFeatures.ts
│   ├── presentation/components/UniVoice/sections/
│   │   ├── SetupSection/         # 正式なSetup画面
│   │   ├── ControlSection/       # 制御パネル
│   │   ├── StatusSection/        # 状態表示
│   │   ├── TranscriptionSection/ # 文字起こし表示
│   │   ├── HistorySection/       # 履歴表示
│   │   └── ProgressiveSummarySection/ # 要約表示
│   └── services/
│       └── SessionStorageService.ts # セッション保存（未使用）
│
├── tests/                         # テストファイル
│   ├── unit/                      # 単体テスト
│   ├── integration/               # 統合テスト
│   └── performance/               # パフォーマンステスト
│
├── docs/                          # ドキュメント
│   ├── ARCHITECTURE.md           # アーキテクチャ設計
│   ├── API-CONTRACTS.md          # API仕様
│   └── ACTIVE/                   # 作業状態
│       ├── STATE.json            # 現在の状態
│       └── TASKS.json            # タスクリスト
│
└── scripts/                       # ユーティリティスクリプト
    └── sync-contracts.js          # 型定義同期
```

## 主要ファイルの役割

### バックエンド
- `UnifiedPipelineService.ts`: 音声認識と翻訳の中央制御、SentenceCombiner統合
- `AdvancedFeatureService.ts`: 要約・語彙・レポート生成の高度な機能
- `IPCGateway.ts`: Zod検証を使った型安全なIPC通信

### フロントエンド  
- `UniVoice.tsx`: メインUIコンポーネント、各セクションの統合
- `useUnifiedPipeline.ts`: バックエンドとのイベント連携フック
- `SetupSection.tsx`: 言語設定とセッション開始UI

### 設定ファイル
- `package.json`: 依存関係とスクリプト定義
- `tsconfig.json`: TypeScript設定（strict: true）
- `.env`: API キーと環境設定