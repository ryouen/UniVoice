# UniVoice データ永続化設計書

作成日: 2025-08-23
バージョン: 2.0.0

## 📋 概要

UniVoiceの授業データ永続化システムは、授業単位でデータを整理し、効率的な管理とアクセスを実現します。

## 🗂️ フォルダ構造

```
Documents/UniVoiceData/
├── 経営学/                      # 授業名フォルダ（日付不要）
│   ├── 20250824_第1回/         # YYYYMMDD_第N回
│   │   ├── session.json        # セッションメタデータ
│   │   ├── transcripts.json    # 文字起こしデータ
│   │   ├── translations.json   # 翻訳データ
│   │   ├── summaries.json     # 要約データ（10分ごと）
│   │   ├── vocabulary.json    # 語彙データ
│   │   ├── memos.json        # メモデータ
│   │   └── report.md         # 最終レポート
│   ├── 20250831_第2回/
│   ├── 20250907_第3回/
│   └── course-metadata.json   # 授業全体のメタデータ
├── 英語会話/
│   ├── 20250825_第1回/
│   └── course-metadata.json
└── システム設定.json           # アプリ全体の設定

```

## 📊 データモデル

### 1. session.json（セッションメタデータ）
```json
{
  "sessionId": "経営学_20250824_1",
  "courseName": "経営学",
  "sessionNumber": 1,
  "date": "20250824",
  "startTime": "2025-08-24T09:00:00.000Z",
  "endTime": "2025-08-24T10:30:00.000Z",
  "sourceLanguage": "en",
  "targetLanguage": "ja",
  "duration": 5400,  // 秒
  "wordCount": 12500,
  "version": "2.0.0"
}
```

### 2. course-metadata.json（授業メタデータ）
```json
{
  "name": "経営学",
  "createdAt": "2025-08-24T09:00:00.000Z",
  "lastModified": "2025-09-14T10:30:00.000Z",
  "totalSessions": 4,
  "tags": ["ビジネス", "MBA", "必修"],
  "description": "経営学の基礎を学ぶ授業"
}
```

### 3. transcripts.json（文字起こし）
```json
[
  {
    "id": "t_1234567890",
    "text": "Today we will discuss the fundamentals of management.",
    "timestamp": 1724486400000,
    "speaker": "professor",
    "confidence": 0.95
  }
]
```

### 4. translations.json（翻訳）
```json
[
  {
    "id": "tr_1234567890",
    "original": "Today we will discuss the fundamentals of management.",
    "translated": "今日は経営学の基礎について議論します。",
    "timestamp": 1724486400000
  }
]
```

### 5. summaries.json（要約）
```json
[
  {
    "id": "sum_10min",
    "timeRange": "00:00-10:00",
    "english": "Introduction to management principles...",
    "japanese": "経営学の原則の紹介...",
    "wordCount": 1250,
    "timestamp": 1724487000000
  }
]
```

### 6. vocabulary.json（語彙）
```json
[
  {
    "term": "management",
    "definition": "The process of dealing with or controlling things or people",
    "translation": "経営、管理",
    "context": "Modern management requires both technical and soft skills.",
    "importance": "high"
  }
]
```

### 7. memos.json（メモ）
```json
[
  {
    "id": "memo_1234567890",
    "text": "重要：次回までにケーススタディを読む",
    "timestamp": 1724486700000,
    "tags": ["宿題", "重要"]
  }
]
```

## 🔄 自動保存の仕組み

### 保存タイミング
1. **定期保存**: 3分ごと（180秒）
2. **イベント駆動保存**:
   - 要約生成完了時
   - メモ追加時
   - 語彙生成完了時
   - レポート生成時
3. **セッション終了時**: 最終保存

### 保存プロセス
```typescript
// 自動保存フロー
1. タイマーイベント発生（3分ごと）
2. 現在のセッションデータを収集
3. 各JSONファイルに増分保存
4. メタデータ更新（wordCount, lastModified等）
5. ログ記録
```

## 🔍 データアクセスパターン

### 授業一覧の取得
```typescript
// Documents/UniVoiceData/の直下フォルダをスキャン
const courses = await getCourseList();
// => [{ name: "経営学", totalSessions: 4, lastModified: "..." }]
```

### 特定授業のセッション一覧
```typescript
// 授業フォルダ内の日付フォルダをスキャン
const sessions = await getSessionList("経営学");
// => [{ sessionNumber: 4, date: "20250914", duration: 5400 }]
```

### セッションデータの読み込み
```typescript
// 全データファイルを並列読み込み
const sessionData = await loadSession("経営学", "20250824_第1回");
```

## 🎯 ユーザーフロー

### 1. 新規授業開始
```
1. ユーザーが授業名入力（例："経営学"）
2. システムが授業フォルダ作成
3. 第1回のセッションフォルダ作成（20250824_第1回）
4. 自動保存開始
```

### 2. 既存授業の継続
```
1. ユーザーが授業名選択
2. システムが最新セッション番号を計算
3. 新しいセッションフォルダ作成（例：第5回）
4. 前回の設定（言語等）を引き継ぎ
```

### 3. 過去データの参照
```
1. 授業一覧から選択
2. セッション一覧表示
3. 特定セッション選択
4. データ読み込み・表示
```

## 🔧 実装の要点

### エラーハンドリング
- ディスク容量不足時の対処
- 書き込み権限エラーの処理
- ネットワークドライブ対応
- 同時アクセス制御

### パフォーマンス最適化
- 増分保存（差分のみ書き込み）
- 非同期I/O処理
- メモリ効率的なストリーミング
- インデックスファイルの活用

### セキュリティ
- ファイルパスのサニタイズ
- 機密情報の暗号化オプション
- バックアップ機能

## 📱 将来の拡張

### クラウド同期
- OneDrive/Dropbox連携
- リアルタイム同期
- 競合解決メカニズム

### データ分析
- 学習進捗の可視化
- 語彙習得率の分析
- 授業参加統計

### エクスポート機能
- PDF形式での授業ノート生成
- Anki用語彙カード出力
- 授業録画との同期

## 🚨 注意事項

1. **ファイル名の制限**
   - Windows: `< > : " | ? *` は使用不可
   - 自動的に `_` に置換

2. **ストレージ容量**
   - 1授業（90分）≈ 10-20MB
   - 定期的なアーカイブ推奨

3. **データ移行**
   - 旧バージョンからの移行ツール提供
   - バックワード互換性の維持

---

このデータ永続化システムにより、学生は授業データを体系的に管理し、効率的な復習と学習が可能になります。