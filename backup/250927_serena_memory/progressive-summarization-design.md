# Progressive Summarization Design for UniVoice 2.0

## 概要
段階的要約（Progressive Summarization）は、長時間の講義を効率的に要約するための仕組み。
文字数に基づいて段階的に要約を生成し、前の要約を活用して次の要約を作成する。

## 段階設定
- 400文字: 初回要約
- 800文字: 400文字の要約 + 追加400文字を要約
- 1600文字: 800文字の要約 + 追加800文字を要約
- 2400文字: 1600文字の要約 + 追加800文字を要約
- 以降: 800文字ごとに要約を更新

## 実装方針
1. SegmentManagerで文字数をトラッキング
2. 閾値に達したらAdvancedFeatureServiceで要約生成
3. 前の要約を context として渡す
4. 要約は英語で生成後、日本語に翻訳

## 参考実装
親プロジェクトの test-gpt5-helpers.js で実装されている：
- generateSummary(): 英語要約生成（prevOneLiner パラメータで前の要約を渡す）
- translateSummary(): 要約の日本語翻訳

## 注意事項
- temperatureパラメータは使用しない（GPT-5では1.0のみサポート）
- reasoningパラメータはmini/5モデルでのみ使用可能