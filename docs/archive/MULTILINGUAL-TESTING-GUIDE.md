# 多言語機能テストガイド

作成日: 2025-08-23

## 🚀 クイックスタート

### 1. 環境準備

```bash
# 1. 環境変数確認（.envファイル）
cat .env | grep -E "(OPENAI|DEEPGRAM)"

# 2. 依存関係確認
npm install

# 3. TypeScriptビルド確認
npm run typecheck
npm run build
```

### 2. アプリケーション起動

```bash
# 開発モードで起動
npm run dev

# 別ターミナルでElectron起動
npm run electron
```

### 3. 多言語機能のテスト手順

1. **初期画面確認**
   - SetupSectionに言語選択ドロップダウンが2つ表示される
   - デフォルト: Source=English、Target=日本語

2. **言語変更テスト**
   - Source Language: English → Spanish
   - Target Language: 日本語 → 中文
   - クラス名入力: "Test Multilingual"
   - 「Start Session」クリック

3. **動作確認ポイント**
   - ✅ 言語選択が保持されているか
   - ✅ 翻訳が選択した言語ペアで動作するか
   - ✅ 要約が正しい言語で生成されるか
   - ✅ LocalStorageに保存されるか（DevTools確認）

### 4. デバッグ用コンソールログ

```javascript
// DevTools Consoleで確認
localStorage.getItem('sourceLanguage')  // 選択したソース言語
localStorage.getItem('targetLanguage')  // 選択したターゲット言語

// ネットワークタブで確認
// - Deepgram WebSocket: language=<source>
// - OpenAI API: 翻訳プロンプトに言語名が含まれる
```

## 🧪 統合テスト実行

```bash
# 多言語サポートテスト
node tests/integration/test-multilingual-support.js

# 期待される出力
🧪 UniVoice Multi-language Support Test
=====================================

🌐 Testing en → ja...
📝 Translation prompt: You are a professional translator...
✅ All tests passed for en → ja

🌐 Testing en → zh...
📝 Translation prompt: You are a professional translator...
✅ All tests passed for en → zh

[... 他の言語ペア ...]

📊 Test Summary
===============
✅ English to Japanese: 5/5 tests passed
✅ English to Chinese: 5/5 tests passed
✅ Japanese to English: 5/5 tests passed
✅ Spanish to English: 5/5 tests passed
✅ Same language (no translation): 5/5 tests passed

🎯 Overall: 5/5 language pairs passed
⚡ Average test duration: XXXms
```

## 🔍 確認項目チェックリスト

### 基本機能
- [ ] 言語選択UIが表示される
- [ ] 16言語すべてが選択可能
- [ ] 選択した言語がLocalStorageに保存される
- [ ] アプリ再起動時に前回の選択が復元される

### 翻訳機能
- [ ] 英語→日本語の翻訳が動作
- [ ] 日本語→英語の翻訳が動作
- [ ] 中国語、スペイン語など他言語も動作
- [ ] 同一言語選択時は翻訳がスキップされる

### 高度な機能
- [ ] 要約が選択した言語で生成される
- [ ] 語彙抽出が正しく動作する
- [ ] 最終レポートが適切な言語で生成される

### エラーハンドリング
- [ ] 不正な言語コードでエラーにならない
- [ ] ネットワークエラー時の挙動が適切

## 🐛 トラブルシューティング

### 言語選択が反映されない
1. LocalStorageをクリア: `localStorage.clear()`
2. アプリケーションを再起動
3. DevToolsでエラーを確認

### 翻訳が動作しない
1. .envファイルのAPIキーを確認
2. ネットワーク接続を確認
3. コンソールログでエラーメッセージを確認

### GPT-5の推論が混入する
- 既知の問題です（TASKS.json #143参照）
- 翻訳結果に説明文が含まれる場合があります
- 修正予定

## 📊 パフォーマンス確認

```bash
# メトリクス測定（実装予定）
npm run metrics

# 確認項目
- First paint: ≤ 1000ms
- Translation complete: ≤ 2000ms
- Summary generation: ≤ 3000ms
```

## 🎯 次のステップ

1. **基本テスト完了後**
   - 履歴表示UIの改善（ライトテーマ化）
   - セッションデータの永続化
   - レポート生成UI実装

2. **将来的な改善**
   - 言語自動検出機能
   - UIテキストの多言語化（i18n）
   - 言語別の最適化

---

テスト完了後は、結果を `/docs/ACTIVE/WORK_LOG.jsonl` に記録してください。