# 文単位履歴管理システム設計

## 問題点
- 現在: 1セグメント = 0.8秒の区切り = 文の断片
- 履歴が断片的で読みにくい
- 翻訳品質が文脈不足で低下

## 解決案

### 1. セグメント結合システム
```typescript
interface CombinedSentence {
  id: string;
  segments: string[];        // 元のセグメントID群
  originalText: string;      // 結合された原文
  realtimeTranslation: string; // リアルタイム翻訳（既存）
  qualityTranslation?: string; // 高品質翻訳（新規）
  timestamp: number;
  duration: number;          // 発話時間
}
```

### 2. 文末検出ロジック
- 句読点（。、．、！、？）
- ピリオド + スペース + 大文字
- 2秒以上の無音
- 話者交代

### 3. 2段階翻訳
1. **リアルタイム翻訳**（変更なし）
   - 各セグメントを即座に翻訳
   - レスポンス優先（1秒以内）
   - モデル: gpt-5-nano

2. **履歴用高品質翻訳**（新規）
   - 2-3文をバッチ処理
   - 文脈を考慮した自然な翻訳
   - モデル: gpt-5-mini/gpt-5
   - プロンプト例:
   ```
   以下の講義内容を、文脈を考慮して自然な日本語に翻訳してください。
   専門用語は正確に、説明は分かりやすく翻訳してください。
   
   [原文]
   {combined_sentences}
   ```

### 4. UI表示
- リアルタイム: 現状維持（セグメント単位）
- 履歴: 文単位で表示
- 高品質翻訳が完了したら差し替え

### 5. 実装優先順位
1. SentenceCombinerクラスの実装
2. FlexibleHistoryGrouperの修正
3. 高品質翻訳サービスの追加
4. UI更新ロジックの調整