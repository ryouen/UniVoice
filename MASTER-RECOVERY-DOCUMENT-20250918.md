# UniVoice 2.0 マスターリカバリードキュメント
作成日: 2025-09-18
作成者: Claude Code

## 🔴 現在の重大な問題

1. **リアルタイム文字起こしが一切表示されない**
   - ログではDeepgramが音声を受信している
   - ASRイベントが発生していない可能性
   - SyncedRealtimeDisplayManagerが正しく動作していない

2. **背景透過機能が失われた**
   - 最近のコミット「faa74be transparent design applied」で実装されていた
   - SessionMemoryService統合時に誤って削除された可能性

3. **コンポーネントの無限再レンダリング**
   - UniVoice.tsxが延々と再初期化されている
   - activeSessionの変更検知が無限ループを引き起こしている可能性

## 📋 調査すべきコミット

1. **faa74be transparent design applied** - 透過デザイン実装
2. **b18e870 real-time area fixed** - リアルタイム表示の修正
3. **3e4e62d Redesign Windows Management** - 最新のコミット

## 🔍 調査計画

1. 各コミットの差分を確認
2. 失われた機能のコードを特定
3. 現在のコードとの差分を比較
4. 必要な部分のみを復元

## 📝 作業ログ

### Step 1: 現在の未コミット変更の把握
- 多数のファイルが変更されている
- 主な変更:
  - SessionMemoryService統合
  - useUnifiedPipeline.tsへの変更
  - UniVoice.tsxへの変更
  - SyncedRealtimeDisplayManagerへの変更（これが問題の可能性）

### Step 2: 問題の根本原因分析

#### 問題2: コンポーネントの無限再レンダリング
**症状:**
- UniVoice.tsxが延々と再初期化されている
- ログが大量に出力されている

**調査すべき点:**
- activeSession stateの変更検知
- useEffectの依存配列
- SessionStorageServiceとの相互作用

#### 問題1: リアルタイム文字起こしが表示されない
**原因の特定:**
1. DeepgramStreamAdapterは正しく音声を受信している（ログで確認）
2. UnifiedPipelineService.tsの654行目で`processTranscriptSegment`メソッドを呼び出している
3. しかし、`processTranscriptSegment`メソッドが存在しない！
4. これにより、ASRイベントがフロントエンドに送信されていない

**解決策:**
- `processTranscriptSegment`メソッドを実装する必要がある
- このメソッドはASRイベントをemitし、翻訳処理をトリガーすべき

**実装完了:**
- `handleTranscriptSegment`メソッドを実装した
- ASRイベントを発火するようにした
- SentenceCombinerに転送するようにした
- 翻訳キューに追加するようにした

**追加の問題発見:**
- TranscriptSegmentという型は存在しない
- 実際にはTranscriptResultという型を使用すべき
- 古いprocessTranscriptSegmentメソッドが残っていて型エラーを引き起こしている

**修正完了:**
- handleTranscriptSegmentメソッドをTranscriptResult型で実装
- 古いhandleTranscriptSegmentOldメソッドを削除
- 未使用のtranslateSegmentメソッドを削除
- SentenceCombiner.tsの型定義を修正（startMs, endMsを追加）
- ビルドが成功するようになった