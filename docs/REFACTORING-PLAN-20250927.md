# UniVoice リファクタリング計画書
作成日: 2025-09-27
作成者: Claude Code (deep-think protocol適用)

## 🎯 目的
UniVoice 2.0のコードベースにおける技術的負債を解消し、Clean Architecture + CQRS + Event-Driven パターンに完全準拠させる。

## 📊 現状分析（検証済み事実）

### 1. 命名規則の不統一（最重要）

#### 問題箇所（実コード検証済み）
- **UnifiedPipelineService.ts line 746**:
  ```typescript
  this.emit('translationComplete', {
    id: segmentId,
    original: text,        // ❌ 古い命名
    japanese: text,        // ❌ 言語ハードコード
    timestamp: Date.now(),
    firstPaintMs: 0,
    completeMs: 0
  });
  ```

- **同ファイル line 887（正しい実装）**:
  ```typescript
  this.emit('translationComplete', {
    id: segmentId,
    sourceText: result.sourceText,      // ✅ 正しい命名
    targetText: result.targetText,      // ✅ 正しい命名
    sourceLanguage: result.sourceLanguage,
    targetLanguage: result.targetLanguage,
    timestamp: Date.now(),
    firstPaintMs: firstPaintTime,
    completeMs: completeTime
  });
  ```

#### 影響範囲
- main.ts: `translationComplete`イベントを`translation-complete`として転送
- 複数のテストファイル: イベント構造の不整合により失敗の可能性
- フロントエンド: 2つの異なるイベント構造を処理する必要

### 2. 型定義の重複（検証済み）
- TranscriptSegmentが4箇所で定義されている
- 各定義で微妙に異なるプロパティ
- 型の不整合によるランタイムエラーのリスク

### 3. 言語のハードコーディング（検証済み）
- `japanese`/`english`が複数箇所でハードコード
- 36言語サポートとの矛盾
- 拡張性の欠如

### 4. コンポーネントの責務過多
- UniVoice.tsx: 1500行以上
- UI表示、状態管理、ビジネスロジックが混在
- テスタビリティの低下

## 🚀 リファクタリング計画

### Phase 1: 型定義の統一（優先度: 最高）

#### 目標
すべてのTranscriptSegment定義を統一し、単一の信頼できる型定義源を確立

#### 作業内容
1. **型定義の調査と統合**
   ```bash
   # 現在の定義箇所を確認
   grep -n "interface TranscriptSegment" --include="*.ts" -r .
   ```
   
2. **統一型定義の作成**
   - `src/domain/models/Transcript.ts`を唯一の定義源とする
   - 必要なプロパティをすべて含む包括的な型定義

3. **既存コードの移行**
   - 各ファイルのimportを更新
   - 型の不整合を解消

#### 期待効果
- 型安全性の向上
- ランタイムエラーの削減
- 開発効率の向上

### Phase 2: 命名規則の統一（優先度: 高）

#### 目標
original/translation → source/target への完全移行

#### 作業内容
1. **UnifiedPipelineService.ts line 746の修正**
   ```typescript
   // 修正前
   this.emit('translationComplete', {
     id: segmentId,
     original: text,
     japanese: text,
     // ...
   });
   
   // 修正後
   this.emit('translationComplete', {
     id: segmentId,
     sourceText: text,
     targetText: text,  // 一時的に同じ値
     sourceLanguage: this.languageConfig.sourceLanguage,
     targetLanguage: this.languageConfig.targetLanguage,
     // ...
   });
   ```

2. **イベントリスナーの更新**
   - すべての`translationComplete`リスナーを調査
   - 新しいイベント構造に対応

3. **テストの更新**
   - イベント構造の変更に伴うテスト修正

#### リスクと対策
- **リスク**: 既存のイベントリスナーが動作しなくなる
- **対策**: 一時的な互換性レイヤーの実装（1週間後に削除）

### Phase 3: 言語ハードコーディングの除去（優先度: 中）

#### 目標
すべての言語固定値を設定可能な値に変更

#### 作業内容
1. **LanguageConfig依存の徹底**
   - すべての言語参照をLanguageConfigから取得
   - ハードコードされた文字列の除去

2. **Summary型の改善**
   ```typescript
   // 現在
   interface Summary {
     english: string;
     japanese: string;
   }
   
   // 改善後
   interface Summary {
     sourceText: string;
     targetText: string;
     sourceLanguage: string;
     targetLanguage: string;
   }
   ```

### Phase 4: UniVoice.tsx の責務分割（優先度: 低）

#### 目標
1500行のコンポーネントを機能別に分割

#### 作業内容
1. **カスタムフックへの抽出**
   - 音声処理ロジック → useAudioCapture
   - リアルタイム文字起こし → useRealtimeTranscription  
   - 翻訳キュー管理 → useTranslationQueue
   - セッションメモリ → useSessionMemory

2. **UIコンポーネントの分割**
   - TranscriptSection
   - ControlPanel
   - StatusBar
   - HistoryView

#### 注意事項（deep-thinkプロトコル準拠）
- 一度に1つの機能のみを切り出す
- 各切り出し後にテストを実行
- フォールバックや後方互換性の実装は避ける

## 📋 実装順序とスケジュール

| Phase | 期間 | 依存関係 | リスク |
|-------|------|---------|-------|
| Phase 1 | 1-2日 | なし | 低 |
| Phase 2 | 2-3日 | Phase 1 | 中 |
| Phase 3 | 2-3日 | Phase 2 | 低 |
| Phase 4 | 5-7日 | Phase 1-3 | 高 |

## ✅ 成功基準

1. **すべてのテストがグリーン**
2. **型エラーゼロ**
3. **パフォーマンス基準の維持**
   - first paint ≤ 1000ms
   - translation complete ≤ 2000ms
4. **コードの可読性向上**
   - 各ファイル500行以下
   - 単一責任の原則の遵守

## 🚨 リスクと対策

### リスク1: 大規模変更による既存機能の破壊
**対策**: 
- 段階的な実装
- 各段階での完全なテスト
- ユーザーへの影響を最小化

### リスク2: パフォーマンスの劣化
**対策**:
- 各段階でベンチマーク実行
- StreamCoalescerの設定維持
- 不要な再レンダリング防止

### リスク3: 開発期間の長期化
**対策**:
- 優先順位の明確化
- Phase 1-2を最優先で完了
- Phase 4は必要に応じて延期可能

## 📝 実装時の注意事項

1. **deep-thinkプロトコルの厳守**
   - 表面的な修正を避ける
   - 完全な理解に基づく実装
   - テストによる検証

2. **一度に一つの変更**
   - 複数の変更を同時に行わない
   - 各変更後のテスト実行
   - コミットの粒度を小さく保つ

3. **ドキュメントの更新**
   - 各Phase完了時にドキュメント更新
   - 変更内容の記録
   - 新しい知見の追加

---

このリファクタリング計画は、実際のコード調査に基づいて作成されました。
各Phaseは独立して実装可能であり、優先順位に従って順次実行します。