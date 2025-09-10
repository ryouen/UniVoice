# 進捗的要約がUIに表示されない問題

## 現状

### バックエンド（動作している）
- `AdvancedFeatureService`で進捗的要約が生成されている（ログで確認）
- `progressive-summary`イベントがmain.tsから送信されている（416行目）

### フロントエンド（問題箇所）

1. **useUnifiedPipeline.ts**
   - `progressiveSummary`ケースでsummariesステートに追加（749行目）
   - ✅ 正しく実装されている

2. **UniVoice.tsx**
   - summariesステートから最新の要約を取得（515-522行目）
   - ❌ **通常の要約と進捗的要約を区別していない**
   - ❌ **すべての要約を同じように扱っている**

## 問題の詳細

```typescript
// UniVoice.tsx（515-522行目）
useEffect(() => {
  if (summaries && summaries.length > 0) {
    const latestSummary = summaries[summaries.length - 1];
    setSummaryJapanese(latestSummary.japanese || '');
    setSummaryEnglish(latestSummary.english || '');
    console.log('[UniVoice] Summary updated:', latestSummary);
  }
}, [summaries]);
```

この実装では：
- 最新の要約のみを表示
- 進捗的要約（400, 800, 1600, 2400語）もすべて上書きされる
- ユーザーは進捗的要約の存在に気づけない

## 解決策

### 案1: 進捗的要約専用の表示エリアを作成
- 進捗的要約の履歴をすべて表示
- 閾値（400, 800語など）を明示

### 案2: SummarySectionを拡張
- タブやアコーディオンで進捗的要約を切り替え表示
- 現在の単語数/文字数を表示

### 案3: 最小限の修正
- 進捗的要約が生成されたことを通知
- モーダルで詳細を表示

## 授業終了後の要約タイミング

現在の実装では：
- `stopListening`時に`generateSummary(true)`が呼ばれていない
- `AdvancedFeatureService.stop()`では定期要約タイマーを停止するのみ
- 最終要約は`generateFinalReport`で生成されるが、これは別途手動で呼ぶ必要がある

### 必要な修正
1. `stopListening`時に最終要約を生成
2. または、UIに「セッション終了」ボタンを追加して最終要約を生成