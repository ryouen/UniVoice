# Temperature エラー修正記録

## 問題
GPT-5モデル（gpt-5-nano、gpt-5-mini、gpt-5）では、temperature パラメータは 1.0 のみサポートされている。
0.3 などの値を設定すると以下のエラーが発生する：
```
400 Unsupported value: 'temperature' does not support 0.3 with this model. Only the default (1) value is supported.
```

## 影響範囲
1. UniVoice/electron/services/domain/UnifiedPipelineService.ts
   - line 524: translateSegment メソッド内で temperature: 0.3

2. UniVoice/electron/services/domain/AdvancedFeatureService.ts
   - line 187: generateSummary メソッド内で temperature: 0.3
   - line 289: generateVocabulary メソッド内で temperature: 0.2
   - line 368: generateFinalReport メソッド内で temperature: 0.5
   - line 435: translateToJapanese メソッド内で temperature: 0.3

## 解決策
全ての temperature パラメータを削除するか、1.0 に設定する。
GPT-5 モデルではデフォルト値（1.0）で十分な品質が得られるため、パラメータ自体を削除することを推奨。

## 修正日時
2025-08-18