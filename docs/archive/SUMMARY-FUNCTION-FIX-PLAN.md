# 要約機能修正計画（改訂版）

## 調査結果

### 実装済みの機能（驚きの発見！）
1. **CJK言語の文字数カウント** - `countWords`メソッドで既に実装済み（日本語・中国語）
2. **閾値の4倍調整** - `CHARACTER_LANGUAGE_MULTIPLIER`環境変数で実装済み（デフォルト4）
3. **言語別プロンプト** - 日本語、英語、中国語の進捗的要約プロンプトが完備

### 実際の問題点
1. **定期要約（10分ごと）が不要** - ユーザーは進捗的要約（400, 800*n words）のみを求めている
2. **韓国語（ko）が未対応** - `isCharacterBasedLanguage`メソッドに含まれていない
3. **ログの不整合** - `isCharacterBased`がfalseになっているケースがある（調査必要）

### ログからの証拠（再分析）
```json
{"message":"Progressive summary threshold reached","data":{"totalWordCount":1609,"isCharacterBased":false}}
```
- `isCharacterBased`がfalseになっている → ソース言語が'en'として認識されている可能性

## 必要な修正内容（最小限）

### 1. 韓国語（ko）のサポート追加

```typescript
// isCharacterBasedLanguage メソッドの修正（737行目）
private isCharacterBasedLanguage(language: string): boolean {
  return language === 'ja' || language === 'zh' || language === 'ko';  // 'ko'を追加
}
```

### 2. 定期要約の無効化

```typescript
// startメソッドの修正（109-135行目付近）
start(sourceLanguage: string, targetLanguage: string, correlationId: string): void {
  // ... 既存のコード ...
  
  // 定期要約の開始を削除またはコメントアウト
  // this.startPeriodicSummary(); // 削除
  
  // ...
}
```

### 3. ドキュメントの更新

#### CRITICAL-FACTS-FOR-NEW-SESSION.md
```markdown
### 3. すべてのコア機能が実装済み
- ✅ 音声認識（Deepgram）
- ✅ リアルタイム翻訳（GPT-5-nano）
- ✅ データ永続化（C:\Users\{username}\UniVoice\）
- ✅ 進捗的要約（400, 800*n words、CJK言語は4倍の文字数）
- ❌ ~~定期要約（10分ごと）~~ → 無効化済み（不要のため）
```

#### START-HERE.md
```markdown
| 進捗的要約 | ✅ | 400, 800*n words（CJK言語は文字数×4） |
| 定期要約 | ❌ | 無効化（不要のため） |
```

## テスト計画

1. 英語での単語数カウントが正しく動作することを確認
2. 日本語・中国語での文字数カウントが正しく動作することを確認
3. 閾値（400→1600文字、800→3200文字）で要約が生成されることを確認
4. 定期要約が実行されないことを確認

## 影響範囲

- `electron/services/domain/AdvancedFeatureService.ts` - 2行の修正のみ
- `docs/CRITICAL-FACTS-FOR-NEW-SESSION.md` - ドキュメント更新
- `docs/START-HERE.md` - ドキュメント更新

## リスク評価

- **極低リスク**: 既存の実装を活用し、最小限の変更のみ
- **注意点**: 
  - 韓国語プロンプトが未実装（英語プロンプトが使用される）
  - 環境変数 `CHARACTER_LANGUAGE_MULTIPLIER` のドキュメント化が必要

## 重要な発見

既にCJK言語対応は実装されており、以下の機能が動作しています：
- 日本語・中国語の文字数カウント（句読点を除外）
- 閾値の自動4倍調整
- 言語別の進捗的要約プロンプト

必要な修正は：
1. 韓国語のサポート追加（1行）
2. 定期要約の無効化（1行）
3. ドキュメントの更新