# GitHubバックアップ差分詳細分析レポート (2025-09-19)

## 統計サマリー
- **変更ファイル数**: 51ファイル
- **新規ファイル数**: 38ファイル
- **削除ファイル数**: 0ファイル
- **最新同期コミット**: bcdf2c6 (2025-09-18 TEST Suite Update)

---

## ファイル別詳細差分分析

### 1. electron/services/domain/UnifiedPipelineService.ts

#### 変更ブロック1: 行652-670 (setupDeepgramEventHandlers内)
**削除されたコード:**
```typescript
// TranscriptResult を既存の TranscriptSegment 形式に変換
const segment: TranscriptSegment = {
  id: result.id,
  text: result.text,
  timestamp: result.timestamp,
  confidence: result.confidence,
  isFinal: result.isFinal,
  startMs: result.startMs,
  endMs: result.endMs
};

this.processTranscriptSegment(segment);
```

**新しいコード:**
```typescript
this.handleTranscriptSegment(result);
```

**機能変更:**
- TranscriptResultからTranscriptSegmentへの変換処理を削除
- processTranscriptSegmentメソッドへの呼び出しをhandleTranscriptSegmentへ変更
- データ変換ロジックを新メソッドに移動

#### 変更ブロック2: 行703-811 (processTranscriptSegmentメソッド全体を削除)
**削除された処理:**
1. データフロー可視化ログ出力 (`[DataFlow-1]`, `[DataFlow-2]`, `[DataFlow-3]`)
2. finalセグメントのみの保存処理
3. translateSegmentメソッドの呼び出し
4. sentenceCombiner.addSegmentの呼び出し
5. ASRイベントの発行
6. currentOriginalUpdateイベントの直接発行

**削除されたtranslateSegmentメソッド:**
- 翻訳リクエストをキューに追加する処理
- エラーハンドリングとログ出力
- TRANSLATION_QUEUE_ERRORイベントの発行

#### 変更ブロック3: 行846-852 (executeTranslationメソッド内に追加)
**追加されたコード:**
```typescript
// 文字化けデバッグ情報
console.log('[Translation] Debug - Raw translation:', translation);
console.log('[Translation] Debug - Cleaned translation:', cleanedTranslation);
console.log('[Translation] Debug - First 10 char codes:', [...cleanedTranslation.slice(0, 10)].map(c => c.charCodeAt(0)));
```

**機能追加:**
- 翻訳結果の文字化けをデバッグするためのログ出力
- 生の翻訳結果、クリーン化後の結果、文字コードを出力

#### 変更ブロック4: 行1160-1227 (新規handleTranscriptSegmentメソッド追加)
**追加された新メソッド:**
```typescript
private async handleTranscriptSegment(result: TranscriptResult): Promise<void>
```

**新メソッドの処理内容:**
1. finalセグメントのデバッグログ出力
2. TranscriptResultをsegmentオブジェクトに変換して保存
3. ASRイベントの発行（createASREvent）
4. finalセグメントのSentenceCombinerへの追加
5. finalセグメントの翻訳キューへの追加（enqueue）
6. エラーハンドリング（エラーを握りつぶして継続）

**主な違い:**
- asyncメソッドとして実装（旧processTranscriptSegmentは同期）
- TranscriptResultを直接受け取る（型変換不要）
- currentOriginalUpdateイベントを発行しない
- エラー時に処理を継続する設計

---

### 2. src/components/UniVoice.tsx

#### 変更ブロック1: 行16-31 (import文の変更)
**追加されたimport:**
```typescript
import { useSessionMemory } from '../hooks/useSessionMemory';
import { sessionStorageService } from '../services/SessionStorageService';
import { WindowClient } from '../services/WindowClient';
import type { Memo } from '../presentation/components/UniVoice/modals/types';
```

**変更されたimport:**
```typescript
// 旧: import { SetupSection } from '../presentation/components/UniVoice/sections/SetupSection/SetupSection';
// 新: import { SetupSection } from '../presentation/components/UniVoice/sections/SetupSection';
```

**削除されたコード:**
```typescript
// 旧: import { windowClient } from '../services/WindowClient';
```

#### 変更ブロック2: 行36-48 (型定義の変更)
**削除された型定義:**
```typescript
interface Memo {
  id: string;
  timestamp: string;
  japanese: string;
  english: string;
}
```

**追加された型定義:**
```typescript
interface HistoryEntry {
  id: string;
  timestamp: Date;
  sourceText: string;
  targetText: string;
  isHighQuality?: boolean;
  sentenceId?: string;
  sentenceGroupId?: string;
}
```

**変更内容:**
- Memo型を外部からimportするように変更
- HistoryEntryの定義が大幅に変更（Date型、高品質フラグ、グループID追加）
- 言語固定のjapanese/englishからsourceText/targetTextへ変更

#### 変更ブロック3: 行238-291 (状態管理の変更)
**旧実装:**
```typescript
const [showSetup, setShowSetup] = useState(!sessionConfig);
const [selectedClass, setSelectedClass] = useState<string | null>(sessionConfig?.className || null);
```

**新実装:**
```typescript
const [activeSession, setActiveSession] = useState<{
  className: string;
  sourceLanguage: string;
  targetLanguage: string;
} | null>(null);

const [previousSession, setPreviousSession] = useState<{
  className: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp?: number;
} | null>(() => {
  const stored = sessionStorageService.loadActiveSession();
  if (stored) {
    console.log('[UniVoice] Previous session found:', stored);
    return stored;
  }
  return null;
});

const [showSetup, setShowSetup] = useState(!activeSession);
```

**機能変更:**
- sessionConfigベースからactiveSession/previousSessionベースへ移行
- セッション永続化機能の追加（sessionStorageService使用）
- 前回セッションの復元機能

#### 変更ブロック4: 行264-291 (useEffect追加)
**新規追加:**
```typescript
useEffect(() => {
  console.log('[UniVoice] activeSession changed:', {
    activeSession,
    showSetup,
    languages: activeSession ? { source: activeSession.sourceLanguage, target: activeSession.targetLanguage } : null,
    timestamp: new Date().toISOString()
  });

  if (activeSession) {
    sessionStorageService.saveActiveSession(activeSession);
  }
}, [activeSession]);
```

**機能追加:**
- activeSession変更時の自動永続化
- デバッグログの出力

#### 変更ブロック5: 行301-310 (言語設定の変更)
**旧実装:**
```typescript
const [sourceLanguage, setSourceLanguage] = useState(() =>
  sourceLanguageOverride || sessionConfig?.sourceLanguage || localStorage.getItem('sourceLanguage') || 'en'
);
```

**新実装:**
```typescript
const languagePrefs = sessionStorageService.loadLanguagePreferences();

const [sourceLanguage, setSourceLanguage] = useState(() => {
  return sourceLanguageOverride || activeSession?.sourceLanguage || languagePrefs?.sourceLanguage || 'en';
});
```

**機能変更:**
- localStorageからsessionStorageServiceへ移行
- languagePreferencesの統一的な管理

#### 変更ブロック6: 行331-334 (新しい状態追加)
**追加された状態:**
```typescript
const [showProgressiveSummary, setShowProgressiveSummary] = useState(false);
const [progressiveSummaryHeight, setProgressiveSummaryHeight] = useState(200);
```

**機能追加:**
- プログレッシブサマリー表示機能の追加

#### 変更ブロック7: 行412-433 (WindowClient初期化)
**旧実装:**
```typescript
// import文でwindowClientを直接import
```

**新実装:**
```typescript
const windowClient = WindowClient.getInstance();
```

**機能変更:**
- WindowClientのシングルトンインスタンス化

#### 変更ブロック8: 行416-436 (useUnifiedPipeline初期化)
**旧実装:**
```typescript
const pipeline = useUnifiedPipeline({
  sourceLanguage: sessionConfig ? sourceLanguage : '',
  targetLanguage: sessionConfig ? targetLanguage : '',
```

**新実装:**
```typescript
const pipelineSourceLang = sourceLanguage || 'multi';
const pipelineTargetLang = targetLanguage || 'ja';

const pipeline = useUnifiedPipeline({
  sourceLanguage: pipelineSourceLang,
  targetLanguage: pipelineTargetLang,
  className: activeSession?.className || undefined,
```

**機能変更:**
- 空文字列の代わりにデフォルト値('multi', 'ja')を使用
- classNameパラメータの追加
- sessionConfigベースからactiveSessionベースへ

#### 変更ブロック9: 行438-440 (SessionMemory追加)
**新規追加:**
```typescript
const sessionMemory = useSessionMemory();
```

**機能追加:**
- セッションメモリ機能の統合

---

## 主要な機能変更まとめ

### UnifiedPipelineService.ts
1. **メソッドのリファクタリング**: processTranscriptSegment → handleTranscriptSegment
2. **非同期処理への移行**: 新メソッドはasync/await使用
3. **エラーハンドリングの改善**: エラーを握りつぶして継続
4. **デバッグ機能追加**: 文字化けデバッグログ
5. **イベント発行の簡略化**: currentOriginalUpdateイベントを削除

### UniVoice.tsx
1. **セッション管理の刷新**: activeSession/previousSession導入
2. **永続化機能の強化**: sessionStorageService統合
3. **型安全性の向上**: より詳細な型定義
4. **言語設定の改善**: デフォルト値の明確化
5. **プログレッシブサマリー機能**: 新機能の追加
6. **WindowClientのシングルトン化**: インスタンス管理の改善

---

### 3. electron/main.ts

#### 変更ブロック1: 行6-9 (import文の復元)
**変更内容:**
```typescript
// GitHub版: import os from 'os';
// ローカル版（削除）: // import os from 'os'; // 未使用のためコメントアウト
// 復元後: import os from 'os';
```

**機能変更:**
- 🔄 **復元済み**: osモジュールを再度有効化（透過設定の判定で必要）

#### 変更ブロック2: 行104 (変数の復元)
**変更内容:**
```typescript
// GitHub版: const isWindows = process.platform === 'win32';
// ローカル版（削除）: // const isWindows = process.platform === 'win32'; // 未使用のためコメントアウト
// 復元後: const isWindows = process.platform === 'win32';
```

#### 変更ブロック3: 行107-117 (Windows透過設定の復元)
**復元された処理:**
```typescript
let supportsTransparency = true;
if (isWindows) {
  try {
    const release = os.release().split('.');
    const build = parseInt(release[2]) || 0;
    supportsTransparency = build >= 17134; // Windows 10 1803
  } catch (e) {
    supportsTransparency = false;
  }
}
```

**機能変更:**
- 🔄 **復元済み**: Windows透過設定の自動判定を再有効化
- Windows 10 1803以降の判定ロジック復活

#### 変更ブロック4: 行120-127 (baseOptionsの復元)
**復元された実装:**
```typescript
const baseOptions: Electron.BrowserWindowConstructorOptions = {
  show: false,
  frame: false,
  transparent: supportsTransparency,
  backgroundColor: supportsTransparency ? '#00000000' : '#f0f0f0',
  ...(isMac ? {
    vibrancy: 'under-window' as const,
    visualEffectState: 'active' as const
  } : {})
};
```

**機能変更:**
- 🔄 **復元済み**: show、frame、transparent、backgroundColorの設定を復元
- グラスモーフィズム効果対応の透過ウィンドウを再有効化

#### 変更ブロック5: 行157,173,180 (URLロードのハッシュ削除)
**変更内容:**
```typescript
// 旧: await mainWindow.loadURL(`http://localhost:${port}#/setup`);
// 新: await mainWindow.loadURL(`http://localhost:${port}/`);

// 旧: await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'setup' });
// 新: await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
```

**機能変更:**
- Setup画面への直接ルーティング（#/setup）を削除
- ルートパスからのロードに変更

#### 変更ブロック6: 行193 (DevTools設定)
**変更内容:**
```typescript
// 旧: mainWindow?.webContents.openDevTools();
// 新: mainWindow?.webContents.openDevTools({ mode: 'detach' });
```

**機能追加:**
- DevToolsをdetachモードで開くように変更

---

### 4. electron/main/WindowRegistry.ts

#### 変更ブロック1: 行37-46 (resolveUrl修正)
**旧実装:**
```typescript
return `http://localhost:${ports[0]}${hash}`;
```

**新実装:**
```typescript
const url = `http://localhost:${ports[0]}/${hash}`;
return url;
```

**機能変更:**
- HashRouter対応のURL生成
- hashの前にスラッシュを追加

#### 変更ブロック2: 行41-46 (本番環境URL生成)
**新実装:**
```typescript
if (hash) {
  return `file://${path.join(app.getAppPath(), 'dist', 'index.html')}${hash}`;
}
return `file://${path.join(app.getAppPath(), 'dist', 'index.html')}`;
```

**機能変更:**
- hashが空の場合の処理を追加
- 条件分岐によるURL生成

#### 変更ブロック3: 行71-73 (透過設定の復元)
**変更内容:**
```typescript
// GitHub版: transparent: false, backgroundColor: '#FFFFFF',
// ローカル版（変更）: transparent: false, backgroundColor: '#1e1e1e',
// 復元後: transparent: true, backgroundColor: '#00000000',
```

**機能変更:**
- 🔄 **復元済み**: 透過設定を再有効化（false → true）
- 完全透明背景に変更（#1e1e1e → #00000000）
- グラスモーフィズム効果の復活

#### 変更ブロック4: 行85-91 (デバッグログ追加)
**新規追加:**
```typescript
console.log(`[WindowRegistry] Creating window for role: ${role}`, {
  defaults: { width: defaults.width, height: defaults.height },
  roleDefaults,
  options
});
```

**機能追加:**
- ウィンドウ作成時のデバッグ情報出力

#### 変更ブロック5: 行110-129 (Setup画面のサイズ固定)
**新規追加:**
```typescript
} else {
  // setup画面は常に固定サイズを強制（374px問題の修正）
  const display = screen.getPrimaryDisplay();
  const workArea = display.workArea;

  const targetWidth = 600;
  const targetHeight = 800;
  const safeWidth = Math.min(targetWidth, workArea.width - 100);
  const safeHeight = Math.min(targetHeight, workArea.height - 100);

  window.setMinimumSize(safeWidth, safeHeight);
  window.setMaximumSize(safeWidth, safeHeight);
  window.setBounds({
    width: safeWidth,
    height: safeHeight,
    x: Math.round((workArea.width - safeWidth) / 2),
    y: Math.round((workArea.height - safeHeight) / 2)
  });
  console.log('[WindowRegistry] Setup window size enforced:', { safeWidth, safeHeight });
}
```

**機能追加:**
- Setup画面の374px問題の修正
- 600x800固定サイズの強制
- 画面中央への配置
- ディスプレイサイズに基づく安全なサイズ調整

#### 変更ブロック6: 行269-285 (fitSetupTo簡略化)
**旧実装:**
```typescript
fitSetupTo(width: number, height: number): void {
  // 動的サイズ計算
  const MIN_WIDTH = 600;
  const MIN_HEIGHT = 700;
  // ...複雑な計算ロジック
}
```

**新実装:**
```typescript
fitSetupTo(_width: number, _height: number): void {
  const FIXED_WIDTH = 600;
  const FIXED_HEIGHT = 800;
  // 固定サイズを使用
}
```

**機能変更:**
- パラメータを無視（_width, _height）
- 固定サイズ600x800を強制
- 動的サイズ計算を削除

#### 変更ブロック7: 行330-341 (openHistory改善)
**変更内容:**
```typescript
const targetUrl = this.resolveUrl('#/history');
const currentUrl = window.webContents.getURL();

// 既に正しいURLがロードされていない場合のみロード
if (!currentUrl.includes('#/history')) {
  await window.loadURL(targetUrl);
}
```

**機能改善:**
- URL重複ロードの防止
- 現在のURLチェック追加

---

## 削除されたファイル（GitHubには存在するがローカルでは削除）

### dist-electron/infrastructure/llm/配下
- LLMGateway.d.ts
- LLMGateway.js
- OpenAIGateway.d.ts
- OpenAIGateway.js
- types.d.ts

**削除理由:**
- Shadow Mode実装の一時的な削除
- LLM Gatewayレイヤーの除去

---

## 新規追加ファイル（ローカルのみ、未コミット）

### 主要な新規ファイル
1. src/components/HistoryView.tsx - 履歴ビューコンポーネント
2. src/components/SummaryView.tsx - サマリービューコンポーネント
3. src/services/SessionStorageService.ts - セッション永続化サービス
4. src/services/claude/ - Claude関連サービス（詳細未確認）
5. backup/20250917/ - バックアップディレクトリ
6. examples/ - サンプルコード

### ドキュメント類
- docs/CLEAR-LOCALSTORAGE-GUIDE.md
- docs/CONCEPT-CLARIFICATION-CLASS-VS-SESSION.md
- docs/DATA-PERSISTENCE-AUDIT-20250916.md
- docs/LOCALSTORAGE-MIGRATION-PLAN.md
- docs/SESSION-BEHAVIOR-DESIGN.md
- docs/WINDOW-RESIZE-FIXES-SUMMARY-20250916.md
- MASTER-RECOVERY-DOCUMENT-20250918.md

### デバッグ・テスト用ファイル
- debug-commands.js
- debug-localstorage.html
- debug-window-resize.html
- clear-active-session.html
- clear-localstorage.html
- clear-session.html

---

## まとめ

### 最重要変更
1. **UnifiedPipelineService**: processTranscriptSegment → handleTranscriptSegmentへの全面的リファクタリング
2. **UniVoice.tsx**: セッション管理システムの完全な再設計
3. **WindowRegistry**: Setup画面の374px問題の根本的解決
4. **透過設定**: Windows透過設定を一度削除後、グラスモーフィズム効果対応で復元 🔄

### 影響範囲
- **パフォーマンス**: 非同期処理化により改善
- **安定性**: エラーハンドリングの強化
- **UX**: Setup画面のサイズ問題解決
- **保守性**: コードの簡略化と責任分離

---

作成日: 2025-09-19
作成者: Claude Code
バージョン: 2.0.0