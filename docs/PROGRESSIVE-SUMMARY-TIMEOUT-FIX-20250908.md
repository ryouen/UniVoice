# 累積要約機能によるタイムアウト問題の修正

## 発生日時
2025年9月8日

## 問題の概要
AdvancedFeatureServiceに累積要約機能を実装した後、リアルタイム翻訳がすべてタイムアウトするようになった。

## 根本原因

### 1. 非同期処理の不適切な呼び出し
- `addTranslation()` (同期メソッド) から `checkProgressiveSummaryThresholds()` (非同期メソッド) を `await` なしで呼び出していた
- これにより非同期処理が制御されずにバックグラウンドで実行され、予期しない競合状態が発生

### 2. API呼び出しの輻輳
累積要約生成時に以下の2つのAPI呼び出しが連続して発生：
- 要約生成: `await this.openai.responses.create()` (gpt-5-mini)
- 要約の翻訳: `await this.translateToTargetLanguage()` → `await this.openai.responses.create()` (gpt-5-nano)

### 3. リソース競合
- TranslationQueueManagerの最大並列数は3つ
- 累積要約の追加API呼び出しにより、実質的な同時実行数が増加
- OpenAI APIの同時接続数制限に達してタイムアウトが発生

## 実装した修正

### 1. 非同期処理の適切なスケジューリング
```typescript
// Before (問題のあるコード)
addTranslation(translation: Translation): void {
  // ...
  this.checkProgressiveSummaryThresholds(); // awaitなしで呼び出し
}

// After (修正後)
addTranslation(translation: Translation): void {
  // ...
  // 非同期処理を適切にスケジューリング
  setImmediate(() => {
    this.checkProgressiveSummaryThresholds().catch(error => {
      this.componentLogger.error('Failed to check progressive summary thresholds', { error });
    });
  });
}
```

### 2. 非同期ラッパーメソッドの追加
```typescript
private async generateProgressiveSummaryAsync(baseThreshold: number, threshold: number): Promise<void> {
  try {
    await this.generateProgressiveSummary(baseThreshold, threshold);
  } catch (error) {
    this.componentLogger.error('Failed to generate progressive summary async', { error, baseThreshold });
  }
}
```

### 3. API呼び出しの優先度制御
累積要約の翻訳処理に遅延を追加し、メイン翻訳処理への影響を最小化：
```typescript
private async translateToTargetLanguage(text: string): Promise<string> {
  // ...
  // API呼び出し前に遅延を入れて輻輳を回避
  await new Promise(resolve => setTimeout(resolve, 500));
  // ...
}
```

## 修正の効果
1. **翻訳処理のブロッキング防止**: 累積要約処理が非同期で実行され、メイン翻訳処理をブロックしない
2. **API呼び出しの分散**: 要約関連のAPI呼び出しに遅延を入れることで、同時接続数を制御
3. **エラーハンドリング**: 非同期処理のエラーを適切にキャッチして記録

## 今後の改善案
1. **優先度付きキューの実装**: TranslationQueueManagerに優先度機能を追加し、要約関連の翻訳を低優先度で処理
2. **API呼び出しの統合管理**: すべてのOpenAI API呼び出しを単一のマネージャーで管理し、レート制限を統一的に制御
3. **設定可能なしきい値**: 累積要約のしきい値や遅延時間を環境変数で設定可能にする

## 関連ファイル
- `electron/services/domain/AdvancedFeatureService.ts`
- `electron/services/domain/TranslationQueueManager.ts`
- `electron/services/domain/UnifiedPipelineService.ts`