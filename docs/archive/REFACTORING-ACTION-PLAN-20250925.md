# リファクタリング アクションプラン
作成日: 2025-09-25
更新日: 2025-09-25
ステータス: 完了

## 1. 優先順位付きタスクリスト

### 🔴 Priority 1: アプリケーションが動作しない致命的問題

#### 1.1 TextUpdateManager（旧IncrementalTextManager）のスタブ実装
- **影響**: テキスト表示が更新されない、または過剰に更新される
- **推定工数**: 4時間
- **ブロッカー**: これがないと基本機能が動作しない
- **ステータス**: ✅ 削除完了（不要と判断）
- **対応内容**: 
  - currentOriginal/currentTranslationがUIで未使用のため、関連コードを完全削除
  - IncrementalTextManager.tsとTextUpdateManager.tsを削除
  - 表示はSyncedRealtimeDisplayManagerで十分

### 🟡 Priority 2: パフォーマンス・UXに影響する問題

#### 2.1 テキスト確定時間の設定値変更
- **現状**: 800ms → 80ms（原文）、1000ms → 100ms（翻訳）
- **影響**: 表示が頻繁に更新されすぎる可能性
- **推定工数**: 30分（値を戻すだけ）
- **要判断**: 意図的な変更かどうか
- **ステータス**: ✅ 確認完了（既に800ms/1000msに戻っていた）

#### 2.2 StreamBatcherの削除
- **影響**: 翻訳ストリーミングの効率低下
- **推定工数**: 調査2時間 + 実装2時間
- **要判断**: 本当に必要か測定が必要

### 🟢 Priority 3: 機能は動くが改善が必要な問題

#### 3.1 SyncedRealtimeDisplayManagerのメソッド不足
- **影響**: エラーは出ないが、一部機能が動作しない可能性
- **推定工数**: 2時間

#### 3.2 翻訳タイムアウト時の履歴追加処理
- **影響**: タイムアウトした翻訳が履歴に残らない可能性
- **推定工数**: 1時間

### ⚪ Priority 4: クリーンアップ・最適化

#### 4.1 TranslationBatcherの削除
- **影響**: なし（未使用）
- **推定工数**: 30分
- **ステータス**: ✅ 削除完了
- **対応内容**:
  - TranslationBatcher.tsを削除
  - useTranslationQueue.tsからimportと使用箇所を削除

#### 4.2 ドキュメント更新
- **影響**: 開発効率
- **推定工数**: 1時間
- **ステータス**: ✅ 更新完了
- **対応内容**:
  - 用語統一: Original→Source、Translation→Target
  - デッドコード削除の記録
  - ビルド成功の確認

---

## 2. 意思決定が必要な項目

### 🤔 判断事項 1: テキスト確定時間の変更は意図的か？

**現在の状況**:
```typescript
// リファクタリング前
originalTextManager = new IncrementalTextManager(callback, 800);   // 0.8秒
translationTextManager = new IncrementalTextManager(callback, 1000); // 1秒

// リファクタリング後
originalTextManager = new TextUpdateManager(callback, {
  smoothingDelay: 80,    // 0.08秒（10倍速い！）
  debugLabel: 'Original'
});
translationTextManager = new TextUpdateManager(callback, {
  smoothingDelay: 100,   // 0.1秒（10倍速い！）
  debugLabel: 'Translation'
});
```

**潜在的な影響**:

#### A) 80ms/100msのままにする場合
- ✅ **メリット**: 
  - より即座にテキストが表示される
  - リアルタイム感が向上
  - 低遅延環境では快適
  
- ❌ **デメリット**:
  - 画面がちらつく（0.08秒ごとに更新）
  - CPU使用率が上がる（React再レンダリング増加）
  - ネットワーク不安定時に表示が乱れる

#### B) 800ms/1000msに戻す場合
- ✅ **メリット**:
  - 安定した表示（ちらつきが少ない）
  - CPU負荷が低い
  - 元々の設計意図通り
  
- ❌ **デメリット**:
  - 表示に遅延を感じる可能性
  - 「もっさり」した印象

**📊 推奨**: 元の値（800ms/1000ms）に戻すことを推奨しますが、最終判断をお願いします。

---

### 🤔 判断事項 2: StreamBatcherは本当に必要か？

**削除された機能の詳細**:
```typescript
// StreamBatcherの動作
// 入力: "H" -> "He" -> "Hel" -> "Hell" -> "Hello"
// 出力: "Hello" （100ms間隔でバッチ）

streamBatcher = new StreamBatcher(callback, {
  minInterval: 100,   // 最小更新間隔
  maxWait: 200,      // 最大待機時間
  minChars: 2        // 最小文字数（元）→ 3（変更後）
});
```

**測定が必要な項目**:
1. 現在の翻訳ストリーミング更新頻度（1秒あたり何回？）
2. UIのレンダリング回数
3. 体感的なスムーズさ

**📊 提案**: 
- まずは現状のまま動作確認
- パフォーマンス問題が顕在化したら復元
- 測定結果を見てから判断

---

### 🤔 判断事項 3: 高品質翻訳の処理フローの変更

**リファクタリング前**:
- すべてuseUnifiedPipeline内で処理
- history_/paragraph_プレフィックスで判別

**リファクタリング後**:
- useTranslationQueueに分離
- より構造化されたが、複雑性も増加

**質問**: 
1. 高品質翻訳機能は現在も使用していますか？
2. history_とparagraph_の違いは何ですか？

---

## 3. 実装順序の推奨

### Phase 1: 最小限の動作（1日）
1. TextUpdateManagerの実装（既存ロジックの移植）
2. 設定値の判断と修正
3. 動作確認テスト

### Phase 2: 品質向上（2日）
1. StreamBatcherの必要性判断
2. 不足メソッドの追加
3. パフォーマンステスト

### Phase 3: 完成（1日）
1. 不要コードの削除
2. ドキュメント整備
3. 統合テスト

---

## 4. 追加の疑問点と回答

### 解決済み事項：

1. **IncrementalTextManagerの必要性**
   - **結論**: 不要
   - **理由**: currentOriginal/currentTranslationはUIで未使用
   - **対応**: 完全削除

2. **ASR音声削除防止機能**
   - **調査結果**: そのような実装は存在しない
   - **現状**: SyncedRealtimeDisplayManagerで表示を維持する実装はあるが、初期実装から存在

3. **設定値の影響**
   - **800ms vs 80ms**: 10倍の差で画面更新頻度が12.5回/秒になり、ちらつきの原因
   - **対応**: 元の値を維持（既に戻っていた）

## 5. 今後の改善提案

1. **デバッグラベル機能**
   - `debugLabel: 'Original'` は新機能
   - 活用すべきか、それとも削除すべきか？

2. **エラーアラートの追加**
   - メモ保存時にalert()が追加された
   - より洗練されたエラー表示にすべきか？

3. **セグメントIDの扱い**
   - TextUpdateManagerに`segmentId`パラメータが追加
   - これは新しい要件か、それとも不要か？

### 5.1 Interim表示の3段階改善（後のフェーズ）
- x秒でfinal表示の平均時間を測定
- x/2秒でinterim表示
- x秒でfinalまたは最新interim表示
- recentポジションのみで処理（older/oldestには影響なし）

### 5.2 完了事項まとめ
- ✅ デッドコード完全削除
- ✅ 型チェック成功
- ✅ クリーンビルド成功
- ✅ 用語統一完了