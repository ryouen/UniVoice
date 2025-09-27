# UniVoice.tsx リファクタリング詳細対応表
作成日: 2025-09-25
更新日: 2025-09-25
作成者: Claude Code (Senior Engineer Mode)

## ✅ 2025-09-25更新: デッドコード削除完了

### 削除した要素:
1. **IncrementalTextManager / TextUpdateManager**
   - 削除理由: currentOriginal/currentTranslationがUIで未使用
   - 影響: なし（SyncedRealtimeDisplayManagerが表示を担当）
   
2. **TranslationBatcher**
   - 削除理由: スタブ実装で未使用
   - 影響: なし

3. **用語統一**
   - Original → Source
   - Translation → Target
   
4. **ビルド結果**
   - TypeScriptエラー: 0
   - クリーンビルド成功

## 概要
リファクタリング前のUniVoice.tsx（2885行）から抽出された機能と、その移植先を完全に追跡した対応表です。

## リファクタリング前の状態
- **ファイル**: `src/components/UniVoice.tsx`
- **コミット**: `9881950` (2025-09-23 01:15:14) - "backup: アイコン配置完了状態をバックアップ（CSS統一前）"
- **行数**: 2885行
- **状態**: モノリシックなコンポーネントで、すべての機能が単一ファイルに含まれる

## 機能の移植対応表

### 1. モーダル状態管理（247-251行）
**リファクタリング前**:
```typescript
// 247-251行目
const [showFullscreenModal, setShowFullscreenModal] = useState(false);
const [showMemoModal, setShowMemoModal] = useState(false);
const [showReportModal, setShowReportModal] = useState(false);
const [modalTitle, setModalTitle] = useState('');
const [modalContent, setModalContent] = useState('');
```

**移植先**: `src/hooks/useModalManager.ts`（111行）
- コミット: `483b721` (2025-09-23 12:07:33)
- 完全に同じ状態変数を管理
- `openFullscreenModal`、`closeFullscreenModal`などのアクション関数も追加
- **変更点**: なし（完全互換）

### 2. メモ管理ロジック（254行、1638-1689行）
**リファクタリング前**:
```typescript
// 254行目
const [memoList, setMemoList] = useState<Memo[]>([]);

// 1638-1680行目
const saveAsMemo = async () => {
  const textarea = questionInputRef.current;
  if (!textarea || !textarea.value.trim()) return;
  // ... 翻訳処理とメモ保存ロジック
};

// 1682-1689行目
const saveMemoEdit = (memoId: string) => {
  const memo = memoList.find(m => m.id === memoId);
  if (memo) {
    console.log('[UniVoice] Memo edit requested for:', memoId);
  }
};
```

**移植先**: `src/hooks/useMemoManager.ts`（155行）
- コミット: `aa6d6ff` (2025-09-23 12:18:32)
- **完全に同じロジック**を保持
- 翻訳処理（`generateQuestionTranslation`）も内部に含む
- **変更点**: 
  - エラー時のアラート追加（101行目、119行目）
  - より詳細なログ出力

### 3. フルスクリーンモーダルを開く処理（1938-1951行）
**リファクタリング前**:
```typescript
// 履歴クリック時（1938-1941行）
setModalTitle('');
setModalContent(getAlignedHistoryContent());
setShowFullscreenModal(true);

// 要約クリック時（1948-1951行）
setModalTitle('📊 要約（英日対比）');
setModalContent(getSummaryComparisonContent());
setShowFullscreenModal(true);
```

**移植先**: `useModalManager`の`openFullscreenModal`関数に統合
- これらのロジックは、リファクタリング後も同じ場所に残っている
- ただし、`setModalTitle`と`setModalContent`の個別呼び出しは、`openFullscreenModal(title, content)`の一括呼び出しに変更可能

### 4. 質問入力欄のRef（322行）
**リファクタリング前**:
```typescript
const questionInputRef = useRef<HTMLTextAreaElement>(null);
```

**移植先**: `useMemoManager`内に移動（47行目）
- **完全に同じ実装**

### 5. ヘッダーコントロール（264-265行、270-284行）
**リファクタリング前**:
```typescript
// 264-265行目
const [showHeader, setShowHeader] = useState(true);
const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);

// 270-284行目（useHeaderControlsの使用）
const headerControls = useHeaderControls(
  showHeader, 
  showSettings, 
  isAlwaysOnTop,
  setShowHeader,
  setShowSettings,
  setIsAlwaysOnTop
);
```

**移植先**: 既に`useHeaderControls`フックとして分離済み
- コミット: `4c472bc` (2025-09-20 11:02:43)
- **変更点**: なし（既に実装済み）

## 削除されていない重要な機能

### 1. セッション管理（146-185行）
- `activeSession`、`previousSession`の状態管理
- セッション開始/再開処理（`handleStartSession`、`handleResumeSession`）
- **現在も**UniVoice.tsxに残っている

### 2. 言語設定管理（228-237行）
- `sourceLanguage`、`targetLanguage`の状態
- 言語設定の永続化処理
- **現在も**UniVoice.tsxに残っている

### 3. ウィンドウリサイズ管理（332-358行）
- `realtimeSectionHeight`の管理
- リサイズハンドルとの連携（`useBottomResize`）
- **現在も**UniVoice.tsxに残っている

### 4. パイプライン連携（375-392行）
- `useUnifiedPipeline`フックの使用
- エラーハンドリングとステータス管理
- **現在も**UniVoice.tsxに残っている

## 設定値の変更

### 変更されていない設定
1. **リアルタイムエリアの高さ**: デフォルト250px（LAYOUT_HEIGHTS.realtime.default）
2. **ウィンドウリサイズデバウンス**: 100ms（WINDOW_RESIZE_DEBOUNCE_MS）
3. **自動保存間隔**: 60000ms（60秒）
4. **フォントスケール**: 最小0.8、最大1.2、ステップ0.05

### 追加された設定
- なし（すべての設定値は維持されている）

## 機能の欠落チェック

### ✅ 完全に移植された機能
1. モーダル管理（3種類すべて）
2. メモ機能（保存・編集）
3. 翻訳処理との統合
4. 質問入力欄の参照

### ⚠️ 注意が必要な点
1. **メモ編集機能**: 実装は移植されたが、まだ未完成（TODO: 編集モーダルを開く処理）
2. **エラーハンドリング**: アラート表示が追加されたが、UIとしては改善の余地あり

### ❌ 削除された機能
- なし（すべての機能が保持されている）

---

## useUnifiedPipeline.ts リファクタリング詳細対応表

### リファクタリング前の状態
- **ファイル**: `src/hooks/useUnifiedPipeline.ts`
- **コミット**: `9c3d497` (日付確認中)
- **行数**: 1595行
- **状態**: 複数の責務を持つ大きなフック

### マネージャークラスの移植対応表

#### 1. SyncedRealtimeDisplayManager（260-279行）
**リファクタリング前**:
```typescript
displayManagerRef.current = new SyncedRealtimeDisplayManager(
  (pairs) => {
    // ディスプレイペア更新のコールバック
    setDisplayPairs(pairs);
  }
);
```

**移植先**: `src/hooks/useRealtimeTranscription.ts`（60-67行）
- **変更点**: 
  - コンストラクタ引数がオプショナルになった（デフォルト空関数）
  - `setDisplayPairsCallback`メソッドが追加された
  - **⚠️ スタブ実装の問題**: 現在の実装には`setDisplayPairsCallback`と`finalizeSegment`メソッドが存在しない

#### 2. IncrementalTextManager（298-321行）
**リファクタリング前**:
```typescript
// 原文用（298-309行）
originalTextManagerRef.current = new IncrementalTextManager(
  (text, isStable) => {
    setCurrentOriginal(text);
  },
  800 // 0.8秒で確定
);

// 翻訳用（312-321行）
translationTextManagerRef.current = new IncrementalTextManager(
  (text, isStable) => {
    setCurrentTranslation(text);
  },
  1000 // 1秒で確定
);
```

**移植先**: `src/hooks/useRealtimeTranscription.ts`（71-91行）
- **設定値の変更**:
  - 原文: 800ms → **80ms**（10倍速い！）
  - 翻訳: 1000ms → **100ms**（10倍速い！）
- **追加機能**:
  - `debugLabel`オプションが追加された
- **⚠️ スタブ実装の問題**: TextUpdateManagerは全メソッドが未実装

#### 3. StreamBatcher（324-336行）
**リファクタリング前**:
```typescript
streamBatcherRef.current = new StreamBatcher(
  (batch) => {
    if (translationTextManagerRef.current) {
      translationTextManagerRef.current.update(batch);
    }
  },
  {
    minInterval: 100,
    maxWait: 200,
    minChars: 2
  }
);
```

**移植先**: 削除されている？
- **⚠️ 欠落機能**: StreamBatcherの機能が完全に削除されている
- 翻訳のストリーミング処理のバッチ化が失われている可能性

#### 4. TranslationTimeoutManager（340-345行）
**リファクタリング前**:
```typescript
translationTimeoutManagerRef.current = new TranslationTimeoutManager({
  defaultTimeout: 7000, // 7秒
  enableDynamicTimeout: true,
  maxTimeout: 10000 // 10秒
});
```

**移植先**: `src/hooks/useRealtimeTranscription.ts`（94-96行）
- **変更点**: なし（同じ設定値）
- ✅ 正しく実装されている

#### 5. FlexibleHistoryGrouper（281-293行）
**リファクタリング前**:
```typescript
historyGrouperRef.current = new FlexibleHistoryGrouper(
  (block) => {
    setHistoryBlocks(prev => [...prev, block]);
    // 履歴ブロックをメインプロセスに送信
    if (window.electron?.send) {
      window.electron.send('history-block-created', block);
    }
  }
);
```

**移植先**: `src/hooks/useUnifiedPipeline.ts`（現在も同じ場所）
- **変更点**: なし（リファクタリングされていない）

### StreamBatcherの詳細

**実装内容**（`src/utils/StreamBatcher.ts`）:
- 翻訳テキストのストリーミング更新を効率的にバッチ処理
- 設定値:
  - `minInterval`: 100ms - 最小更新間隔
  - `maxWait`: 200ms - 最大待機時間
  - `minChars`: 3 - 最小文字数（元は2だったが3に変更されている）
- 文末記号（。、！？.,!?）で即座に送信
- **重要**: この機能は完全に削除されており、翻訳のストリーミング更新が非効率になっている可能性

### イベントハンドリングの移植

#### 6. ASRイベント処理（569-608行）
**リファクタリング前**:
```typescript
case 'asr':
  if (displayManagerRef.current) {
    displayManagerRef.current.updateOriginal(
      event.data.text, 
      event.data.isFinal, 
      event.data.segmentId
    );
  }
  if (originalTextManagerRef.current) {
    originalTextManagerRef.current.update(event.data.text);
  }
  // タイムアウト開始処理...
  break;
```

**移植先**: `src/hooks/useRealtimeTranscription.ts`（handleASREvent関数）
- **変更点**:
  - displayManagerとtextManagerの更新が統合された
  - タイムアウト処理も含まれている

#### 7. 翻訳イベント処理（610-795行）
**リファクタリング前**の処理フロー:
1. 高品質翻訳（history_/paragraph_プレフィックス）の処理
2. 通常翻訳の表示更新（StreamBatcher経由）
3. 翻訳完了時の履歴追加

**移植先**: `src/hooks/useTranslationQueue.ts`（handleTranslationEvent関数）
- **重要な変更**:
  - StreamBatcherが削除され、直接更新に変更
  - 高品質翻訳と通常翻訳の処理が分離
  - セグメントマッピング機能が追加

#### 8. 翻訳タイムアウト処理（501-537行）
**リファクタリング前**:
```typescript
const handleTranslationTimeout = useCallback((segmentId: string) => {
  // タイムアウト処理
  if (displayManagerRef.current) {
    displayManagerRef.current.updateTranslation('[翻訳タイムアウト]', segmentId);
    displayManagerRef.current.completeTranslation(segmentId);
  }
  // 履歴追加処理...
}, []);
```

**移植先**: `src/hooks/useRealtimeTranscription.ts`（152-163行のコールバック内）
- **変更点**: 
  - 履歴追加処理が移動している可能性
  - **⚠️ 懸念**: タイムアウト時の履歴追加処理が削除されている？

### useAudioCapture.ts の実装詳細

**オーディオ設定**（84-91行）:
```javascript
audio: {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
  sampleRate: 16000
}
```

**AudioContext設定**（97行）:
- サンプルレート: 16000Hz

**重要な実装**:
- AudioWorkletの読み込み（`/dist/audioWorkletProcessor.js`）
- Workletが失敗してもエラーにならない（フォールバック対応）
- メトリクス（音量、無音検出、継続時間）の提供
- ✅ 完全に実装されている（スタブではない）

## 実装すべき点（優先度順）

### 1. 【最優先】スタブ実装の完全な実装
以下のクラスは現在スタブ（空実装）になっており、実際のロジックを実装する必要があります：

- **TextUpdateManager**（旧IncrementalTextManager）
  - `update(text: string, segmentId?: string)`メソッド
  - タイマーによる確定処理（smoothingDelay）
  - `clear()`と`reset()`メソッド
  
- **TranslationBatcher**（未使用、削除候補）
  - コード内で使用されていない
  - useTranslationQueue.tsでインポートされているが、実際には使われていない
  - 削除しても影響なし

### 2. 【重要】設定値の不整合修正
- IncrementalTextManagerの確定時間が10倍速くなっている
  - 原文: 800ms → 80ms
  - 翻訳: 1000ms → 100ms
  - これは意図的な変更か確認が必要

### 3. 【重要】欠落機能の復元
- **StreamBatcher**が完全に削除されている
  - 翻訳のストリーミング更新のバッチ化機能
  - パフォーマンスへの影響を調査

### 4. 【中優先度】メソッドの追加
- SyncedRealtimeDisplayManagerに以下のメソッドが必要：
  - `setDisplayPairsCallback()`（現在のコードで使用）
  - `finalizeSegment()`（現在のコードで使用）

### 5. 【低優先度】デバッグラベルの活用
- TextUpdateManagerの`debugLabel`オプションが追加されたが未使用
- デバッグ時の識別に有用なので活用すべき

## 設定値の完全な対応表

| 設定項目 | リファクタリング前 | リファクタリング後 | 変更理由 |
|---------|-------------------|-------------------|----------|
| 原文確定時間 | 800ms | 80ms | ❓ 要確認 |
| 翻訳確定時間 | 1000ms | 100ms | ❓ 要確認 |
| 翻訳タイムアウト（デフォルト） | 7000ms | 7000ms | ✅ 変更なし |
| 翻訳タイムアウト（最大） | 10000ms | 10000ms | ✅ 変更なし |
| 動的タイムアウト | 有効 | 有効 | ✅ 変更なし |
| StreamBatcher最小間隔 | 100ms | - | ❌ 削除 |
| StreamBatcher最大待機 | 200ms | - | ❌ 削除 |
| StreamBatcher最小文字数 | 2 | - | ❌ 削除 |

## まとめ

リファクタリングは構造的には成功していますが、以下の重大な問題があります：

1. **スタブ実装の存在**: 主要なクラスが空実装のまま
2. **設定値の不整合**: 確定時間が10倍速くなっている
3. **機能の欠落**: StreamBatcherが完全に削除されている
4. **メソッドの不足**: 使用されているメソッドが実装されていない

これらの問題を解決しない限り、アプリケーションは正常に動作しない可能性が高いです。

---

## 総合評価とアクションアイテム

### リファクタリングの成果
1. **構造の改善**: ✅ Clean Architectureに従った適切な責務分離
2. **コードの可読性**: ✅ 各フックが200-400行に収まり管理しやすい
3. **再利用性**: ✅ 独立したフックとして他のコンポーネントでも使用可能

### 重大な問題点
1. **スタブ実装**: TextUpdateManager（旧IncrementalTextManager）が空実装
2. **設定値の変更**: テキスト確定時間が10倍速くなっている（意図不明）
3. **機能の削除**: StreamBatcherによるバッチ処理が削除

### 緊急対応が必要な項目
1. **TextUpdateManagerの実装**
   - IncrementalTextManagerのロジックをコピーして実装
   - 設定値は元の値（800ms、1000ms）に戻す
   
2. **StreamBatcherの復元検討**
   - 翻訳のストリーミング更新のパフォーマンスを測定
   - 必要に応じて再実装

3. **メソッドの追加**
   - SyncedRealtimeDisplayManagerに不足メソッドを追加
   - または呼び出し側を修正

### 良い点
- useModalManagerとuseMemoManagerは完璧に移植されている
- useAudioCaptureは完全に実装されている
- TranslationTimeoutManagerは正しく移植されている
- 基本的な構造とフローは維持されている

**結論**: リファクタリングの方向性は正しいが、実装の完成度に問題がある。特にスタブ実装は即座に修正が必要。