# UniVoice 履歴保存システム詳細

実装日: 2025-09-19
ステータス: 🔴 部分実装（LocalStorageのみ、ファイルシステム未統合）

## 現在の履歴保存状況

### 1. LocalStorage（ブラウザメモリ）✅ 動作中
```javascript
// 保存場所: ブラウザのLocalStorage
// キー形式: univoice_session_[sessionId]
// 例: univoice_session_20250919-123456
```

**保存内容**:
- セッションID
- クラス名
- 開始時間
- 言語設定（ソース言語、ターゲット言語）
- 履歴（原文と翻訳のペア）

**確認方法**:
1. **ブラウザ開発ツール**:
   - F12キー → Application → Local Storage
   - univoice_session_で始まるキーを確認

2. **外部確認ツール** (check-history.html):
   ```bash
   # UniVoiceルートディレクトリで
   # ブラウザでcheck-history.htmlを開く
   ```
   - 全セッションの履歴を表示
   - テキストまたはJSON形式でエクスポート可能

### 2. ファイルシステム 🔴 未統合

**実装済みだが未使用のコンポーネント**:

#### DataPersistenceService（electron/services/domain/DataPersistenceService.ts）
```typescript
// 設計上の保存場所
const basePath = app.getPath('userData'); // %APPDATA%/univoice
// 構造: univoice-data/2025/09/19/session_001/
```

**想定される保存内容**（実装済みだが未接続）:
- metadata.json - セッションメタデータ
- history.json - 全履歴データ
- summary.json - 要約データ
- vocabulary.json - 語彙データ
- final_report.md - 最終レポート

**問題点**:
- UnifiedPipelineServiceと未統合
- IPCレイヤーで接続されていない
- フロントエンドから呼び出し不可

## 履歴データの構造

### LocalStorageの実際のデータ構造
```typescript
interface SessionData {
  id: string;                    // 例: "20250919-123456"
  className: string;              // 授業名
  startTime: string;              // ISO 8601形式
  sourceLanguage: string;         // 例: "en-US"
  targetLanguage: string;         // 例: "ja-JP"
  transcripts: Array<{
    original: string;             // 原文
    translation: string;          // 翻訳
    timestamp: string;            // タイムスタンプ
  }>;
  summaries?: Array<{
    type: 'progressive' | 'final';
    content: string;
    timestamp: string;
  }>;
  vocabulary?: Array<{
    term: string;
    definition: string;
  }>;
}
```

## アクセス方法

### 1. アプリケーション内から
```typescript
// SessionStorageService経由（src/services/SessionStorageService.ts）
import { sessionStorageService } from '../services/SessionStorageService';

// 履歴の読み込み
const activeSession = sessionStorageService.loadActiveSession();

// 履歴の保存
sessionStorageService.saveActiveSession(sessionData);
```

### 2. 外部ツールから

#### A. check-history.html（推奨）
```html
<!DOCTYPE html>
<!-- UniVoiceルートディレクトリに配置済み -->
<!-- LocalStorageから全履歴を読み取り、エクスポート機能付き -->
```

#### B. ブラウザコンソール
```javascript
// 全セッションキーを取得
const sessionKeys = Object.keys(localStorage)
  .filter(key => key.startsWith('univoice_session_'));

// 特定セッションを読み込み
const session = JSON.parse(
  localStorage.getItem('univoice_session_20250919-123456')
);
```

## 履歴が保存されるタイミング

1. **セッション開始時**
   - 新規セッションID生成
   - 初期メタデータ保存

2. **文結合完了時**（SentenceCombiner）
   - 2-3文がまとまった時点で保存
   - 原文と翻訳のペアで保存

3. **要約生成時**
   - プログレッシブ要約（400語ごと）
   - 最終要約（セッション終了時）

4. **セッション終了時**
   - 全データの最終保存
   - （注: ファイルシステムへの保存は未実装）

## 既知の問題と制限

### 🔴 重大な問題
1. **ファイルシステム保存が機能していない**
   - DataPersistenceService実装済みだが未統合
   - アプリ再起動で履歴消失のリスク

2. **LocalStorage容量制限**
   - ブラウザ制限: 約5-10MB
   - 長時間セッションでオーバーフロー可能性

3. **バックアップ機能なし**
   - 自動バックアップ未実装
   - 手動エクスポートのみ可能

### ⚠️ 注意事項
1. **ブラウザデータクリア時に消失**
   - キャッシュクリアで履歴消失
   - 重要データは手動エクスポート推奨

2. **マルチユーザー非対応**
   - 単一ユーザー前提の設計
   - プロファイル分離なし

## 改善計画

### Phase 1: DataPersistenceService統合（最優先）
```typescript
// 必要な作業
1. IPC契約の追加
2. UnifiedPipelineServiceとの接続
3. フロントエンドフックの作成
```

### Phase 2: 自動バックアップ
```typescript
// 実装予定
- 定期的なファイルシステムへの保存
- クラウドバックアップオプション
- エクスポート/インポート機能
```

### Phase 3: 履歴管理UI
```typescript
// 実装予定
- セッション一覧画面
- 検索・フィルタリング
- 履歴の編集・削除
```

## トラブルシューティング

### 履歴が表示されない場合
1. LocalStorageを確認
2. check-history.htmlで外部確認
3. ブラウザコンソールでエラー確認

### 履歴が保存されない場合
1. LocalStorage容量確認
2. SessionStorageServiceのログ確認
3. ブラウザの設定（プライベートモードなど）

### 履歴をバックアップしたい場合
1. check-history.htmlを開く
2. 各セッションのエクスポートボタンをクリック
3. JSON/テキスト形式で保存

## 関連ファイル

### 実装ファイル
- `src/services/SessionStorageService.ts` - LocalStorage管理
- `electron/services/domain/DataPersistenceService.ts` - ファイル保存（未統合）
- `src/components/UniVoice.tsx` - 履歴UI表示
- `check-history.html` - 外部確認ツール

### ドキュメント
- `docs/DATA-PERSISTENCE-AUDIT-20250916.md` - 永続化監査
- `docs/LOCALSTORAGE-MIGRATION-PLAN.md` - 移行計画
- `.serena/memories/data_persistence_analysis_20250918.md` - 分析メモ

## まとめ

現在のUniVoiceは**LocalStorageのみ**で履歴を保存しています。ファイルシステムへの保存機能（DataPersistenceService）は実装済みですが、**完全に未統合**の状態です。

**重要**: 長時間の授業記録や重要なデータは、必ず`check-history.html`を使用して手動でバックアップしてください。

---

最終更新: 2025-09-19
次のステップ: DataPersistenceService統合の実装