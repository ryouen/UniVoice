# 音声キャプチャ機能修正記録

## 実施日時
2025-08-24

## 修正の背景
助言AIからの指摘により、以下の問題が判明：
1. サンプルレート不整合（ブラウザが48kHz、Deepgramは16kHz前提）
2. Start/Stop連打時の競合状態
3. ScriptProcessorNodeの非推奨警告

## 実装内容

### 1. startFromMicrophoneメソッドの修正
- レース防止のための状態チェック追加
- starting/listening時は処理をスキップ
- エラー時のクリーンアップ改善

### 2. stopメソッドの修正
- 状態チェックによる不要な処理の防止
- listening/starting以外では処理をスキップ

### 3. startAudioCaptureメソッドの修正
- 二重起動防止チェック追加
- リサンプリング機能の実装
- 48kHz→16kHzの自動変換

### 4. リサンプリング実装
```javascript
const resampleTo16k = (input: Float32Array, inRate: number): Int16Array => {
  // 線形補間による単純ダウンサンプル
  // 音声認識には十分な品質
}
```

## 期待される効果
1. サンプルレート不整合による音声認識精度低下の解消
2. 連打時の二重起動・リソースリークの防止
3. 将来的なAudioWorklet移行への準備

## バックアップ
- 元のファイル: `backup/2025-08-24-audio-capture-fix/useUnifiedPipeline.ts.bak`

## テスト確認項目
1. 音声キャプチャが正常に開始されること
2. サンプルレートがログに表示されること
3. 連打してもエラーが発生しないこと
4. 音声認識精度が維持されること