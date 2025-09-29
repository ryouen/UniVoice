# ハイブリッドリファクタリング戦略

作成日: 2025-08-28
作成者: Claude (DEEP-THINK Mode)

## 🔴 絶対規範（CRITICAL RULES）- 全作業に優先

### 動作確認済みモデル設定は一切変更禁止

#### 現在の動作確認済み設定（変更厳禁）

1. **Deepgram設定**
   ```typescript
   model: 'nova-3'  // ✅ 変更禁止
   ```

2. **OpenAI GPT-5シリーズ**
   ```typescript
   // ✅ 正しい設定（変更禁止）
   models: {
     translate: 'gpt-5-nano',      // リアルタイム翻訳
     summary: 'gpt-5-mini',         // 要約
     summaryTranslate: 'gpt-5-nano',
     userTranslate: 'gpt-5-nano',
     vocabulary: 'gpt-5-mini',
     report: 'gpt-5'                // 最終レポート
   }
   
   // ✅ 正しいAPI呼び出し（変更禁止）
   await this.openai.responses.create({
     model: 'gpt-5-nano',
     input: [...],              // messagesではない
     max_output_tokens: 1500,   // max_tokensではない
     stream: true
   });
   ```

#### ❌ 絶対にやってはいけないこと

1. **モデルのダウングレード**
   ```typescript
   // ❌ 絶対禁止
   model: 'gpt-4'  // GPT-5からのダウングレード
   model: 'gpt-3.5-turbo'  // 古いモデル
   ```

2. **APIの変更**
   ```typescript
   // ❌ 絶対禁止
   await this.openai.chat.completions.create()  // 旧式API
   ```

3. **パラメータ名の変更**
   ```typescript
   // ❌ 絶対禁止
   messages: [...]  // inputが正しい
   max_tokens: 1500  // max_output_tokensが正しい
   ```

#### リファクタリング時の必須チェックリスト

- [ ] Deepgramモデルが `nova-3` のまま変更されていないか
- [ ] GPT-5シリーズのモデル名が保持されているか
- [ ] responses.create APIが使用されているか
- [ ] inputパラメータとmax_output_tokensが正しく使用されているか
- [ ] テスト実行で既存機能が動作するか確認

## 🎯 戦略概要

UnifiedPipelineServiceの肥大化問題と、ユーザー要望の新機能を**同時に**解決する戦略。
**ただし、動作確認済みの設定は一切変更しない。**

## 📋 実装計画

### Phase 1: 最小限の責任分離（1-2日）

**🔴 重要**: 以下のリファクタリングでは、Deepgram/OpenAIの設定やAPI呼び出しは一切変更しない。純粋に責任分離のみ実施。

#### 1.1 PipelineStateManager の抽出
```typescript
// 状態管理のみを分離（約100行削減）
// 注意: OpenAI/Deepgramの設定には一切触れない
class PipelineStateManager {
  private state: PipelineState = 'idle';
  private startTime: number = 0;
  private lastActivityTime: number = 0;
  
  setState(newState: PipelineState): void
  getState(): PipelineState
  canTransitionTo(newState: PipelineState): boolean
}
```

**実装前チェック**:
- [ ] OpenAI/Deepgramの呼び出しコードは含まない
- [ ] 状態管理のみを抽出する
- [ ] 既存のモデル設定への参照は変更しない

#### 1.2 PipelineEventEmitter の抽出
```typescript
// イベント発行ロジックを分離（約150行削減）
class PipelineEventEmitter {
  emitASREvent(data: ASREventData): void
  emitTranslationEvent(data: TranslationEventData): void
  emitStatusEvent(data: StatusEventData): void
  // ... その他のイベント
}
```

**メリット**:
- UnifiedPipelineServiceが約900行に削減
- 一時停止/再開の実装が容易に
- リスク最小限

### Phase 2: 一時停止/再開機能の実装（2-3日）

分離されたStateManagerを使用して実装：

```typescript
interface PipelineControl {
  pause(): Promise<void>;
  resume(): Promise<void>;
  isPaused(): boolean;
}

// PipelineStateManagerに追加
class PipelineStateManager {
  // 既存のstate管理に加えて
  private isPausedFlag: boolean = false;
  
  pause(): void {
    if (this.state === 'listening') {
      this.previousState = this.state;
      this.setState('paused');
      this.isPausedFlag = true;
    }
  }
  
  resume(): void {
    if (this.isPausedFlag) {
      this.setState(this.previousState);
      this.isPausedFlag = false;
    }
  }
}
```

### Phase 3: 追加の責任分離（必要に応じて）

ユーザー機能が安定した後：

1. **TranslationOrchestrator**
   - 翻訳関連ロジックを統合（約300行）
   - Shadow Modeロジックも含む

2. **AudioProcessingPipeline**
   - Deepgram接続とオーディオ処理（約200行）

## 🎯 この戦略の利点

1. **即座の価値提供**
   - 最小限の分離で保守性向上
   - ユーザー要望の機能を迅速に実装

2. **リスク軽減**
   - 段階的な変更
   - 各段階でテスト可能

3. **柔軟性**
   - 必要に応じて追加分離
   - 過度な抽象化を回避

## 📊 成功指標

### 短期（1週間）
- [ ] UnifiedPipelineService < 1000行
- [ ] 一時停止/再開機能の動作
- [ ] 既存テストが全て通過

### 中期（1ヶ月）
- [ ] 新機能の安定動作
- [ ] コードの理解しやすさ向上
- [ ] 新規バグの減少

## 実装順序

1. **Day 1-2**: StateManager + EventEmitter抽出
2. **Day 3-4**: 一時停止/再開機能実装
3. **Day 5**: 統合テスト
4. **Week 2+**: 必要に応じて追加分離

## リスク管理

- 各段階で動作確認
- バックアップの作成
- Shadow Modeは現状維持（安定動作中）

## 結論

この戦略により：
- ✅ コード肥大化の即座の改善
- ✅ ユーザー要望への迅速な対応
- ✅ 将来の拡張性確保
- ✅ リスクの最小化