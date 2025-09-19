# UniVoice Clean Architecture リファクタリング実装計画
*作成日: 2025-09-19*
*対象: src/components/UniVoice.tsx (2737行)*

## 🎯 目標
巨大なUniVoice.tsxをClean Architectureに基づいて責務分離し、保守性と拡張性を向上させる。

## 📊 現状分析

### 問題点
1. **巨大ファイル**: 2737行の単一ファイル
2. **責任の混在**:
   - UIレンダリング
   - ビジネスロジック
   - 状態管理
   - イベントハンドリング
   - データ永続化
3. **テスタビリティの低さ**: ロジックとUIが密結合
4. **型安全性の欠如**: 一部に暗黙的な型定義

### 現在の構造（GitHub差分分析より）
- activeSession/previousSessionによるセッション管理
- SessionStorageServiceによる永続化
- WindowClientのシングルトン化
- プログレッシブサマリー機能

## 🏗️ 新しいディレクトリ構造

```
src/
├── components/
│   └── UniVoice/
│       ├── UniVoice.tsx                    # メインコンテナ（200行以下）
│       ├── components/                     # UIコンポーネント
│       │   ├── Header/
│       │   │   ├── Header.tsx
│       │   │   ├── Header.module.css
│       │   │   └── index.ts
│       │   ├── Transcript/
│       │   │   ├── TranscriptSection.tsx
│       │   │   ├── RealtimeDisplay.tsx
│       │   │   └── index.ts
│       │   ├── Controls/
│       │   │   ├── ControlPanel.tsx
│       │   │   ├── RecordingIndicator.tsx
│       │   │   └── index.ts
│       │   ├── Summary/
│       │   │   ├── ProgressiveSummary.tsx
│       │   │   └── index.ts
│       │   └── Modals/
│       │       ├── ExportModal.tsx
│       │       ├── MemoModal.tsx
│       │       └── index.ts
│       ├── hooks/                          # カスタムフック
│       │   ├── useSessionControl.ts
│       │   ├── useWindowResize.ts
│       │   ├── useKeyboardShortcuts.ts
│       │   └── index.ts
│       ├── providers/                      # Context Providers
│       │   ├── SessionProvider.tsx
│       │   ├── ThemeProvider.tsx
│       │   └── index.ts
│       └── utils/                          # ユーティリティ
│           ├── formatters.ts
│           ├── validators.ts
│           └── index.ts
├── domain/                                 # ドメインロジック
│   ├── services/
│   │   ├── SessionService.ts
│   │   ├── TranscriptionService.ts
│   │   └── ExportService.ts
│   └── models/
│       ├── Session.ts
│       ├── Transcript.ts
│       └── Summary.ts
└── infrastructure/                        # インフラ層
    ├── api/
    │   ├── WindowAPI.ts
    │   └── ElectronIPC.ts
    └── storage/
        ├── SessionStorage.ts
        └── MemoryStorage.ts
```

## 📋 実装フェーズ

### Phase 1: 基盤準備（即実装）
1. **ディレクトリ構造作成**
   - components/UniVoice/配下の構造作成
   - domain/とinfrastructure/ディレクトリ作成

2. **型定義の分離**
   - src/types/univoice.types.ts の拡充
   - domain/models/ への移行

3. **定数の分離**
   - src/constants/layout.constants.ts の拡充
   - セクション定義、高さ定義の移行

### Phase 2: ロジック分離（1-2時間）
1. **カスタムフックの抽出**
   ```typescript
   // useSessionControl.ts
   - handleStartSession
   - handleResumeSession
   - handleEndSession
   - nextClass

   // useWindowResize.ts
   - リサイズ関連ロジック全般
   - セクション高さ計算

   // useKeyboardShortcuts.ts
   - キーボードショートカット処理
   ```

2. **ドメインサービスの作成**
   ```typescript
   // SessionService.ts
   - セッション管理ロジック
   - 言語設定管理

   // TranscriptionService.ts
   - 音声認識関連ロジック
   - リアルタイム更新処理
   ```

### Phase 3: UIコンポーネント分離（2-3時間）

#### 3.1 Header Component
**責任**: ヘッダー表示とコントロール
```typescript
// Header.tsx (約300行)
- 録音インジケーター
- 授業情報表示
- 設定ボタン群
```

#### 3.2 TranscriptSection Component
**責任**: リアルタイム文字起こし表示
```typescript
// TranscriptSection.tsx (約400行)
- RealtimeSection統合
- 自動スクロール
- 表示モード切替
```

#### 3.3 ControlPanel Component
**責任**: 操作パネル
```typescript
// ControlPanel.tsx (約200行)
- 録音開始/停止
- 一時停止/再開
- エクスポート機能
```

#### 3.4 ProgressiveSummary Component
**責任**: プログレッシブサマリー表示
```typescript
// ProgressiveSummary.tsx (約150行)
- 要約データ表示
- 高さ調整
- データバインディング修正
```

### Phase 4: Context Provider実装（1時間）
1. **SessionProvider**
   - activeSession管理
   - previousSession管理
   - セッション操作メソッド

2. **ThemeProvider**
   - テーマ状態管理
   - テーマ切替機能

### Phase 5: 統合とテスト（1時間）
1. **新UniVoice.tsx作成**
   - Provider統合
   - コンポーネント配置
   - 200行以下に収める

2. **動作確認**
   - Setup画面遷移
   - セッション開始/終了
   - データ永続化

## 🚀 即時実装項目

### Step 1: ディレクトリ作成
```bash
mkdir -p src/components/UniVoice/{components,hooks,providers,utils}
mkdir -p src/components/UniVoice/components/{Header,Transcript,Controls,Summary,Modals}
mkdir -p src/domain/{services,models}
mkdir -p src/infrastructure/{api,storage}
```

### Step 2: 基本型定義の移行
```typescript
// src/domain/models/Session.ts
export interface Session {
  id: string;
  className: string;
  sourceLanguage: string;
  targetLanguage: string;
  startTime: Date;
  endTime?: Date;
}

// src/domain/models/Transcript.ts
export interface TranscriptSegment {
  id: string;
  text: string;
  translation?: string;
  timestamp: number;
  isFinal: boolean;
}
```

### Step 3: Header Component分離（最初の実装）
```typescript
// src/components/UniVoice/components/Header/Header.tsx
import React from 'react';
import styles from './Header.module.css';

interface HeaderProps {
  className?: string;
  recordingTime: number;
  isPaused: boolean;
  onPause: () => void;
  onSettings: () => void;
  // ... other props
}

export const Header: React.FC<HeaderProps> = (props) => {
  // Headerロジックを移行
};
```

## 📈 期待される効果

### 保守性の向上
- ファイルサイズ: 2737行 → 最大400行/ファイル
- 責任の明確化: Single Responsibility Principle準拠
- テスタビリティ: 各コンポーネント個別テスト可能

### パフォーマンスの改善
- 不要な再レンダリング削減
- メモ化の最適化
- バンドルサイズの削減（コード分割可能）

### 開発効率の向上
- 並行作業可能
- コンフリクト削減
- デバッグ容易化

## ⚠️ リスクと対策

### リスク
1. 実装中のダウンタイム
2. 既存機能の破損
3. 型定義の不整合

### 対策
1. 段階的移行（旧ファイル保持）
2. 各フェーズでのテスト実施
3. TypeScript strict modeでの検証

## 📝 チェックリスト

### Phase 1完了条件
- [ ] ディレクトリ構造作成完了
- [ ] 型定義ファイル作成完了
- [ ] 定数ファイル作成完了

### Phase 2完了条件
- [ ] カスタムフック3つ作成
- [ ] ドメインサービス2つ作成
- [ ] 単体テスト作成

### Phase 3完了条件
- [ ] Header Component完成
- [ ] TranscriptSection完成
- [ ] ControlPanel完成
- [ ] ProgressiveSummary完成

### Phase 4完了条件
- [ ] SessionProvider実装
- [ ] ThemeProvider実装
- [ ] Context統合テスト

### Phase 5完了条件
- [ ] 新UniVoice.tsx完成（200行以下）
- [ ] E2Eテスト通過
- [ ] ビルド成功

## 🔄 次のアクション

1. **即座に実施**: Phase 1のディレクトリ構造作成
2. **その後**: Header Componentの分離実装
3. **並行作業**: カスタムフックの抽出

---
*このドキュメントはDEEP THINKプロトコルに基づいて作成されました*