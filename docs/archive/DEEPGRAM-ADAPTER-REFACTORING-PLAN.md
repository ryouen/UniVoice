# DeepgramStreamAdapter リファクタリング計画

## 実施日時
2025-08-28

## 実施状況
✅ **完了** - 2025-08-28

詳細な結果については [DEEPGRAM-ADAPTER-REFACTORING-RESULTS.md](./DEEPGRAM-ADAPTER-REFACTORING-RESULTS.md) を参照してください。

## 目的
UnifiedPipelineService.ts の Deepgram 関連機能を DeepgramStreamAdapter に移行し、
Clean Architecture の原則に従った疎結合な設計を実現する。

## 現在の状態
- **UnifiedPipelineService.ts**: 1082行（Deepgram処理が密結合）
- **DeepgramStreamAdapter.ts**: 実装完了
- **音声認識**: 動作確認済み

## リファクタリング手順

### Phase 1: 準備（実施済み）
1. ✅ DeepgramStreamAdapter の実装
2. ✅ 単体テストの作成
3. ✅ 現在の動作状態のバックアップ

### Phase 2: UnifiedPipelineService の変更
1. DeepgramStreamAdapter のインポートと初期化
2. WebSocket 関連コードの削除
   - `private ws: WebSocket | null`
   - `connectToDeepgram()` メソッド
   - `getCloseCodeMeaning()` メソッド  
   - `handleDeepgramMessage()` メソッド
3. イベントハンドラーの設定
   - transcript イベント → ASR イベント変換
   - error イベント → エラー処理
   - connected/disconnected イベント → 状態管理
4. `sendAudioChunk()` メソッドの簡略化
5. start/stop メソッドの更新

### Phase 3: イベントフローの変更

#### 現在のフロー
```
Deepgram WebSocket
  ↓ (message)
handleDeepgramMessage()
  ↓ (parse)
processTranscriptSegment()
  ↓ (emit)
- createASREvent()
- emit('currentOriginalUpdate')
- translateSegment() // 翻訳トリガー
- sentenceCombiner.addSegment()
```

#### 新しいフロー
```
DeepgramStreamAdapter
  ↓ (transcript event)
UnifiedPipelineService.onTranscript()
  ↓ (transform)
- emitEvent(createASREvent())
- emit('currentOriginalUpdate')
  ↓ (if final)
- handleFinalTranscript()
  - translateSegment()
  - sentenceCombiner.addSegment()
```

### Phase 4: 影響範囲の確認

#### 削除される機能
- WebSocket 直接管理
- メッセージパース処理
- エラーコード解釈（アダプターに移動）

#### 変更される機能
- 接続/切断処理
- 音声送信処理
- エラーハンドリング

#### 維持される機能
- ASR イベント発行
- 翻訳トリガー
- 履歴管理
- 状態管理

## リスク評価と対策

### リスク 1: イベント形式の不一致
- **対策**: TranscriptResult と既存の TranscriptSegment の変換処理を実装

### リスク 2: エラーハンドリングの漏れ
- **対策**: エラーイベントの適切なマッピング

### リスク 3: パフォーマンスへの影響
- **対策**: イベント処理のオーバーヘッドを最小限に

## テスト計画

1. **単体テスト**
   - DeepgramStreamAdapter（実施済み）
   - UnifiedPipelineService（更新必要）

2. **統合テスト**
   - 音声認識フロー全体
   - エラーケース（接続失敗、送信失敗）
   - 再接続シナリオ

3. **E2E テスト**
   - マイクからの音声入力
   - 翻訳表示まで

## 成功基準

1. 音声認識が現在と同様に動作すること
2. エラーハンドリングが改善されること
3. コードの行数が削減されること（目標: -200行）
4. テストカバレッジが向上すること