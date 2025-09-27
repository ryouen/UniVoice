# タスク完了時のチェックリスト

## 必須確認事項

### 1. TypeScript型チェック
```bash
npm run typecheck
```
- エラーが0件であることを確認
- 型定義の不整合がないか確認

### 2. 型定義同期
```bash
npm run sync-contracts
```
- フロントエンドとバックエンドの contracts.ts が同期されていることを確認

### 3. ビルド確認
```bash
npm run build
```
- ビルドが正常に完了することを確認
- dist/ と dist-electron/ が生成されることを確認

### 4. テスト実行（該当する場合）
```bash
# 修正した機能に関連するテストを実行
npm run test:unit -- --testNamePattern="修正した機能"
```

### 5. 動作確認
```bash
npm run dev     # 別ターミナル1
npm run electron # 別ターミナル2
```
- Setup画面が正常に表示される
- 言語設定が保存される
- 音声認識が開始される
- 翻訳が表示される

## コミット前チェックリスト

### コード品質
- [ ] any型を使用していない
- [ ] エラーハンドリングが適切
- [ ] 不要なconsole.logを削除
- [ ] コメントが適切に記載されている

### 命名規則
- [ ] ファイル名が規約に従っている
- [ ] 変数名・関数名が明確で意味がわかる
- [ ] 定数は UPPER_SNAKE_CASE

### ドキュメント更新
- [ ] 大きな変更の場合、関連ドキュメントを更新
- [ ] CRITICAL-FACTS-FOR-NEW-SESSION.md の情報と矛盾していないか確認
- [ ] 新しい発見があれば STATE.json に記載

### 既存機能への影響
- [ ] 動作していた機能を壊していない
- [ ] Setup画面→メイン画面の遷移が正常
- [ ] ウィンドウリサイズが正常に動作
- [ ] 履歴表示が正常に更新される

## トラブルシューティング

### TypeScriptエラーが出る場合
1. `npm run sync-contracts` を実行
2. `npm run clean` でクリーンビルド
3. VSCodeを再起動

### Electronが起動しない場合
1. `taskkill /F /IM electron.exe` でプロセス終了
2. `%APPDATA%\univoice` フォルダを削除
3. 再度 `npm run electron` を実行

### Setup画面がスキップされる場合
1. LocalStorageをクリア
2. `%APPDATA%\univoice\window-bounds.json` を削除
3. ブラウザのキャッシュをクリア

## 報告事項

### 完了時に報告すること
1. 実装した機能の概要
2. 修正した問題の詳細
3. 動作確認の結果
4. 残課題（あれば）

### 問題発生時に報告すること
1. エラーメッセージの全文
2. 再現手順
3. 関連するログ（logs/univoice-*.jsonl）
4. 試した解決方法