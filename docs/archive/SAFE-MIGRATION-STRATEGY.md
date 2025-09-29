# 安全な LLM Gateway 移行戦略

作成日: 2025-08-28
目的: 既存機能を一切壊さずにLLM処理を段階的に移行する

## 基本方針

**既存コードと新しいコードを並行稼働させ、段階的に切り替える**

## 移行フェーズ

### Phase 0: Shadow Mode（影の実装）
1. 既存の実装はそのまま残す
2. 新しいLLMGatewayを「並行して」実行
3. 結果を比較してログに記録
4. 既存の結果のみを使用

```typescript
// 例：UnifiedPipelineService内
async executeTranslation(text: string) {
  // 既存の実装（変更なし）
  const existingResult = await this.openai.responses.create({...});
  
  // 新しい実装（Shadow Mode）
  if (process.env.ENABLE_LLM_GATEWAY_SHADOW === 'true') {
    try {
      const newResult = await this.llmGateway.complete({...});
      
      // 結果を比較（ログのみ）
      this.componentLogger.info('Shadow mode comparison', {
        match: existingResult.output_text === newResult.content,
        existingLength: existingResult.output_text.length,
        newLength: newResult.content.length
      });
    } catch (error) {
      // Shadow modeのエラーは握りつぶす（既存機能に影響させない）
      this.componentLogger.warn('Shadow mode error', { error });
    }
  }
  
  // 既存の結果を返す
  return existingResult;
}
```

### Phase 1: Feature Flag による切り替え
1. 環境変数で新旧を切り替え可能に
2. 問題があればすぐに戻せる
3. 一部のユーザーのみで試験運用

```typescript
if (process.env.USE_NEW_LLM_GATEWAY === 'true') {
  return await this.llmGateway.complete({...});
} else {
  return await this.openai.responses.create({...});
}
```

### Phase 2: 段階的移行
1. 翻訳機能から移行開始（最もシンプル）
2. 次に要約機能
3. 最後にレポート機能（最も複雑）

### Phase 3: 旧コード削除
1. 全機能が安定動作確認後
2. 1週間以上の運用実績後
3. バックアップを取ってから削除

## 実装順序の変更

### 旧計画（リスクあり）
1. ❌ ModelConfigManager → すぐに使う必要がある
2. ❌ PromptManager → すぐに使う必要がある
3. ❌ LLMGateway → すぐに統合する必要がある

### 新計画（安全優先）
1. ✅ LLM Gateway の基本実装（スタンドアロン）
2. ✅ 単体テストで動作確認
3. ✅ Shadow Mode で既存コードと並行実行
4. ✅ メトリクスを収集して比較
5. ✅ 問題なければ Feature Flag で切り替え

## テスト戦略

### 1. 単体テスト
```typescript
describe('OpenAIGateway', () => {
  it('should produce same results as existing implementation', async () => {
    const text = 'Hello world';
    
    // 既存の実装
    const existingResult = await mockExistingImplementation(text);
    
    // 新しい実装
    const newResult = await gateway.complete({
      purpose: LLMPurpose.TRANSLATION,
      systemPrompt: 'Translate to Japanese',
      userContent: text
    });
    
    // 結果が同じことを確認
    expect(newResult.content).toBe(existingResult.output_text);
  });
});
```

### 2. 統合テスト
- 実際のAPIを使用（テスト環境）
- 既存と新実装の結果を比較
- パフォーマンスも測定

### 3. カナリアリリース
- 一部のセッションのみ新実装を使用
- エラー率をモニタリング
- 徐々に割合を増やす

## 成功基準

1. **機能面**
   - 翻訳結果が既存と同等品質
   - エラー率が増加しない
   - パフォーマンスが劣化しない

2. **技術面**
   - 既存コードを変更しない
   - いつでも切り戻し可能
   - ログで動作を追跡可能

## リスク管理

### リスク1: APIの挙動の違い
- 対策: Shadow Mode で違いを検出

### リスク2: パフォーマンス劣化
- 対策: メトリクスで計測、問題があれば最適化

### リスク3: エラーハンドリングの違い
- 対策: 既存のエラーハンドリングをそのまま使用

## まとめ

この戦略により：
- **既存機能は100%保護される**
- **問題があってもユーザーへの影響はゼロ**
- **データに基づいた移行判断が可能**

「動いているものを壊さない」という絶対原則を守りながら、Clean Architecture への移行を実現します。