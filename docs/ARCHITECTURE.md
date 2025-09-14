# UniVoice 2.0 Architecture Documentation

## 🎯 アーキテクチャ概要

UniVoice 2.0は**Clean Architecture + CQRS + Event-Driven**パターンを採用した、リアルタイム音声翻訳システムです。

## 🏗️ Clean Architecture 原則

### 1. 依存関係の方向
```
外側 → 内側（一方向のみ）

UI層 → Application層 → Domain層
  ↑           ↓
Infrastructure層
```

### 2. 層の責任

#### Domain層（最内側）
- **責任**: ビジネスロジックとルール
- **例**: TranslationQueueManager, SentenceCombiner, SegmentManager
- **依存**: なし（純粋なTypeScript）

#### Application層
- **責任**: ユースケースの実装、ワークフローの制御
- **例**: UnifiedPipelineService, AdvancedFeatureService
- **依存**: Domain層のみ

#### Infrastructure層
- **責任**: 外部システムとの接続
- **例**: OpenAI API, Deepgram API, Electron IPC, LocalStorage
- **依存**: Application層のインターフェース

#### Presentation層（最外側）
- **責任**: ユーザーインターフェース
- **例**: React Components, Hooks
- **依存**: Application層（インターフェース経由）

## 📁 ディレクトリ構造と層の対応

```
UniVoice/
├── electron/                      # Infrastructure + Application層
│   ├── main/                      
│   │   ├── WindowRegistry.ts      # Infrastructure (Window管理)
│   │   ├── BoundsStore.ts         # Infrastructure (永続化)
│   │   └── main.ts                # Infrastructure (エントリポイント)
│   ├── services/                  
│   │   ├── ipc/                   # Infrastructure層
│   │   │   ├── contracts.ts       # 契約定義（Zod）
│   │   │   └── gateway.ts         # IPCゲートウェイ
│   │   ├── domain/                # Domain + Application層
│   │   │   ├── UnifiedPipelineService.ts      # Application
│   │   │   ├── AdvancedFeatureService.ts      # Application
│   │   │   ├── StreamCoalescer.ts             # Domain
│   │   │   ├── SentenceCombiner.ts            # Domain
│   │   │   ├── TranslationQueueManager.ts     # Domain
│   │   │   └── SegmentManager.ts              # Domain
│   │   └── monitoring/            # Infrastructure
│
├── src/                           # Presentation層
│   ├── components/                
│   │   └── UniVoice.tsx          # UI Component（巨大、要分割）
│   ├── hooks/                     
│   │   ├── useUnifiedPipeline.ts  # Application Interface
│   │   └── useAdvancedFeatures.ts # Application Interface
│   ├── services/                  
│   │   └── WindowClient.ts        # Infrastructure Adapter
│   └── types/                     # 共通型定義
```

## 🔴 現在の違反と改善計画

### 1. LocalStorage直接アクセス（SetupSection.tsx）
```typescript
// ❌ 現在の実装（UI層がInfrastructure層に直接依存）
const savedClasses = localStorage.getItem('recentClasses');

// ✅ 改善案（依存性注入）
interface IClassStorage {
  getRecentClasses(): string[];
  saveRecentClasses(classes: string[]): void;
}
```

### 2. ビジネスロジックのUI混在
```typescript
// ❌ 現在の実装（日付フォーマットロジックがUI層に）
const formattedName = `${className}_${new Date().toISOString().split('T')[0]}`;

// ✅ 改善案（Domain層に移動）
interface IClassNameFormatter {
  formatWithDate(className: string): string;
}
```

### 3. 巨大なコンポーネント（UniVoice.tsx - 1800行）
```
現在: 1つの巨大コンポーネントに全て
目標: 責任ごとに分割
- SetupSection ✅（完了）
- RealtimeSection ✅（完了）
- HistorySection（予定）
- SummarySection（予定）
- ControlPanel（予定）
```

## 🎯 実装ロードマップ

### Phase M1: ウィンドウ基盤（✅ 90%完了）
- WindowRegistry実装
- 独立ウィンドウ化
- **残課題**: Setup画面サイズ問題、未実装IPCハンドラー

### Phase M2: UI分割（次期）
- UniVoice.tsxを責任ごとに分割
- Contextによる状態管理の分離

### Phase M3: Hook分割
- useUnifiedPipelineの機能別分解
- ビジネスロジックの整理

### Phase M4: Service分割
- Domain層の完全分離
- ポート・アダプタパターンの導入

## 🛡️ アーキテクチャ守護ルール

### 1. 依存関係チェック
```bash
# インポートの方向を確認
# UI層からDomain層への直接import禁止
grep -r "from.*domain" src/
```

### 2. 型安全性の維持
- 全てのIPC通信はZod検証必須
- any型の使用禁止
- Discriminated Union使用

### 3. テスト戦略
- Domain層: 単体テスト100%カバレッジ
- Application層: 統合テスト
- Infrastructure層: モック使用
- UI層: スナップショットテスト

## 📊 メトリクス目標

| 指標 | 現在 | 目標 |
|------|------|------|
| 最大ファイル行数 | 1800行 | 300行 |
| 循環的複雑度 | 高 | 10以下 |
| テストカバレッジ | 不明 | 80%以上 |
| 型カバレッジ | 90% | 100% |

## 🔧 実装時の注意事項

### IPCチャネル名の不変性
既存のIPCチャネル名は**絶対に変更しない**：
- `streaming:start`
- `streaming:stop`
- `streaming:data`
- 他多数（API-CONTRACTS.md参照）

### ゴールデンマスターテスト
リファクタリング前後で必ず実行：
```bash
npm run test:golden-master
```

### パフォーマンス基準
- first paint ≤ 1000ms
- complete ≤ 2000ms
- UI更新頻度削減 ≥ 50%

---

最終更新: 2025-09-14
バージョン: 1.0.0