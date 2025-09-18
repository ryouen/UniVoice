# SentenceCombiner 動作確認テスト計画

**作成日**: 2025-09-17  
**目的**: SentenceCombiner統合後の動作確認

## 🧪 テスト手順

### 1. アプリケーション起動
```bash
npm run electron
```

### 2. コンソールログの確認ポイント

#### バックエンド（Electron）側
- [ ] `[SentenceCombiner] initialized` - 初期化確認
- [ ] `[DataFlow-1] Transcript segment received` - セグメント受信
- [ ] `[DataFlow-3] Adding to SentenceCombiner` - 文結合処理
- [ ] `[DataFlow-4] Combined sentence created` - 結合文作成
- [ ] `[DataFlow-5] Queuing history translation` - 履歴翻訳キュー
- [ ] `[SentenceCombiner] Sentence combined` - 結合完了

#### フロントエンド（DevTools）側
- [ ] `[DataFlow-11] CombinedSentence received in frontend` - イベント受信
- [ ] `[DataFlow-12] Mapping segment X to combined Y` - ID マッピング
- [ ] `[DataFlow-13] Added combined sentence to history grouper` - 履歴追加

### 3. UI確認ポイント

#### リアルタイム表示
- [ ] 音声認識のテキストがリアルタイムで表示される
- [ ] 翻訳がリアルタイムで表示される
- [ ] 3行表示が正しく機能する

#### 履歴表示
- [ ] 履歴に2-3文単位でグループ化されて表示される
- [ ] 初期は「翻訳中...」ではなく通常の翻訳が表示される
- [ ] 数秒後に高品質翻訳に更新される（視覚的な変化）

### 4. 期待される動作フロー

1. **音声入力開始**
   - 0.8秒ごとにセグメントが生成される

2. **文の結合**
   - 2-3個のセグメントが1つの文として結合される
   - CombinedSentenceEventが発行される

3. **履歴表示**
   - 結合された文が履歴に追加される
   - 初期翻訳が表示される

4. **高品質翻訳**
   - history_プレフィックス付きで翻訳が実行される
   - 履歴の翻訳が高品質版に更新される

### 5. デバッグコマンド

```javascript
// DevTools Console で実行
// 現在のマッピング状態を確認
console.log('segmentToCombinedMap:', window.segmentToCombinedMap);

// 高品質翻訳の状態を確認
console.log('highQualityTranslations:', window.highQualityTranslations);

// 履歴ブロックの状態を確認
console.log('historyBlocks:', window.historyBlocks);
```

## ⚠️ 注意事項

- 初回起動時はSetup画面が表示される
- 言語設定を確認（英語→日本語など）
- 長めに話して複数の文が生成されることを確認

## 📊 成功基準

1. **文の結合**: 2-3個のセグメントが1つにまとまる
2. **履歴表示**: グループ化された文として表示
3. **高品質翻訳**: 数秒後に翻訳が更新される
4. **エラーなし**: コンソールにエラーが表示されない

---

テスト実施日: _______________  
テスト実施者: _______________  
結果: □ 成功 / □ 失敗  
備考: _____________________