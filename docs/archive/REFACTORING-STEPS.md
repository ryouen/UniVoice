# リファクタリング作業手順書

## 📋 SetupSection抽出の詳細手順

### 1. 現在の状態を記録（完了）
- [x] E2Eテストの作成
- [x] 課題リストの作成
- [x] 移行計画の策定

### 2. 共通基盤の構築（完了）
- [x] イベント定数の一元化（events.ts）
- [x] 型安全なEventBusの実装
- [x] ディレクトリ構造の作成

### 3. SetupSectionの抽出（完了）

#### 3.1 新コンポーネントの作成（完了）
- [x] SetupSection.tsx
- [x] ClassSelector.tsx
- [x] index.ts

#### 3.2 UniVoice.tsxへの統合（完了）
- [x] インポートの追加
- [x] コンポーネントの置き換え
- [x] 動作確認とコミット

#### 3.2 UniVoicePerfect.tsxの分析

**SetupSectionに関連する要素:**
1. **State**
   - `showSetup`
   - `selectedClass`

2. **関数**
   - `selectClass`
   - `startSession`

3. **useEffect**
   - キーボードショートカット（Space キー）

4. **レンダリング部分**
   - 初期設定画面全体（1093行〜1187行）

#### 3.3 安全な移行手順

1. **インポートの追加**
```typescript
import { SetupSection } from './presentation/components/UniVoice/sections/SetupSection';
```

2. **State と関数の調整**
   - `selectClass` 関数を削除（SetupSection内で管理）
   - `startSession` 関数を調整（onStartSessionとして渡す）

3. **レンダリング部分の置き換え**
   - 条件分岐 `showSetup && ...` の中身を `<SetupSection />` に置き換え

4. **動作確認**
   - ビルド成功
   - セッション開始機能の動作
   - キーボードショートカットの動作

### 4. テストとコミット

#### 4.1 テスト項目
- [ ] ビルドが成功する
- [ ] 初期画面が表示される
- [ ] 授業選択が機能する
- [ ] セッション開始が機能する
- [ ] Space キーショートカットが機能する
- [ ] LocalStorageへの保存が機能する

#### 4.2 コミット
```bash
git add .
git commit -m "refactor: extract SetupSection component from UniVoicePerfect

- Create clean SetupSection component with single responsibility
- Move class selection logic to dedicated component
- Maintain all existing functionality
- Reduce UniVoicePerfect.tsx size by ~100 lines"
```

### 5. RealtimeSectionの抽出（完了）

#### 5.1 分析

**RealtimeSectionに含まれる要素:**
1. **3行表示システム（固定高さ44vh）**
   - 左側: currentOriginal（リアルタイム文字起こし）
   - 右側: currentTranslation（リアルタイム翻訳）
   - 中央: volumeLevel（音声レベルインジケーター）

2. **関連するState**
   - currentDisplay（3段階表示用）
   - currentOriginal（最新の文字起こし）
   - currentTranslation（最新の翻訳）
   - volumeLevel（音声レベル）
   - isRunning（録音状態）

3. **関連するロジック**
   - 3段階表示のための文字列管理
   - フォントサイズの自動調整
   - 音声レベルの視覚化

#### 5.2 実装計画

1. **ディレクトリ構造**
   ```
   src/presentation/components/UniVoice/sections/RealtimeSection/
   ├── RealtimeSection.tsx      # メインコンポーネント
   ├── ThreeLineDisplay.tsx     # 3行表示システム
   ├── VoiceVisualizer.tsx      # 音声ビジュアライザー
   └── index.ts
   ```

2. **Props設計**
   ```typescript
   interface RealtimeSectionProps {
     currentOriginal: string;
     currentTranslation: string;
     volumeLevel: number;
     isRunning: boolean;
     style?: React.CSSProperties;
   }
   ```

### 6. 次のステップ

1. **RealtimeSection の実装**

2. **HistorySection の抽出**
   - 履歴表示
   - FlexibleHistoryDisplay統合
   - リサイズ機能

3. **カスタムフックの分割**
   - useResize
   - useKeyboardShortcuts
   - useAutoSave

## ⚠️ リスクと対策

### リスク1: 状態管理の破壊
**対策**: propsを通じた明確な通信

### リスク2: イベントハンドラの重複
**対策**: 責任の明確な分離

### リスク3: スタイルの崩れ
**対策**: インラインスタイルの維持

## 📊 進捗状況

| タスク | 状態 | 削減行数 |
|--------|------|----------|
| SetupSection | ✅ 完了 | ~100行 |
| UniVoice.tsxへリネーム | ✅ 完了 | - |
| RealtimeSection | ✅ 完了 | ~71行 |
| HistorySection | 📅 計画中 | ~200行 |
| SummarySection | 📅 計画中 | ~150行 |
| QuestionSection | 📅 計画中 | ~150行 |

**目標**: UniVoice.tsx を 1798行 → 200行以下に
**現在**: 1627行（SetupSection抽出で100行、RealtimeSection抽出で71行削減）

---
最終更新: 2024-08-22