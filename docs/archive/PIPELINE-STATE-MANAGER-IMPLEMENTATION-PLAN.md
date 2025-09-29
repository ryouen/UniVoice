# PipelineStateManager 実装計画

作成日: 2025-08-28  
作成者: Claude (DEEP-THINK Mode)

## 🎯 目的

UnifiedPipelineService (1167行) から状態管理ロジックを抽出し、責任を分離する。

## 🔴 絶対規範の再確認

### 変更禁止事項
1. Deepgramモデル: `nova-3` → 変更禁止
2. OpenAIモデル: `gpt-5-nano`, `gpt-5-mini`, `gpt-5` → 変更禁止  
3. API呼び出し: `responses.create` → 変更禁止
4. パラメータ: `input`, `max_output_tokens` → 変更禁止

### 実装ルール
- **純粋に状態管理のみ**を抽出
- OpenAI/Deepgramの呼び出しコードには触れない
- 既存のインターフェースを維持

## 📊 現状分析

### UnifiedPipelineServiceの状態管理要素

```typescript
// 現在の状態管理関連（約100行）
private state: PipelineState = 'idle';
private currentCorrelationId: string | null = null;
private startTime: number = 0;
private lastActivityTime: number = 0;

// 状態遷移メソッド
private setState(newState: PipelineState): void
getState(): {...}

// 状態による制御
startListening(): 'idle'のみ可能
stopListening(): 'idle'以外で可能
sendAudioChunk(): 'listening'のみ可能
```

## 🏗️ 実装設計

### PipelineStateManager インターフェース

```typescript
// electron/services/domain/PipelineStateManager.ts

export type PipelineState = 'idle' | 'starting' | 'listening' | 'processing' | 'stopping' | 'error' | 'paused';

export interface StateTransition {
  from: PipelineState;
  to: PipelineState;
  timestamp: number;
  reason?: string;
}

export class PipelineStateManager {
  private state: PipelineState = 'idle';
  private previousState?: PipelineState;
  private startTime: number = 0;
  private lastActivityTime: number = 0;
  private correlationId: string | null = null;
  private stateHistory: StateTransition[] = [];
  
  // 基本操作
  setState(newState: PipelineState, reason?: string): void {
    if (!this.canTransitionTo(newState)) {
      throw new Error(`Invalid state transition: ${this.state} -> ${newState}`);
    }
    
    const oldState = this.state;
    this.state = newState;
    this.stateHistory.push({
      from: oldState,
      to: newState,
      timestamp: Date.now(),
      reason
    });
    
    this.onStateChange(oldState, newState);
  }
  
  getState(): PipelineState {
    return this.state;
  }
  
  // 状態遷移の妥当性チェック
  canTransitionTo(newState: PipelineState): boolean {
    const validTransitions: Record<PipelineState, PipelineState[]> = {
      'idle': ['starting'],
      'starting': ['listening', 'error', 'idle'],
      'listening': ['processing', 'stopping', 'error', 'paused'],
      'processing': ['listening', 'stopping', 'error'],
      'stopping': ['idle', 'error'],
      'error': ['idle'],
      'paused': ['listening', 'stopping']
    };
    
    return validTransitions[this.state]?.includes(newState) ?? false;
  }
  
  // 一時停止/再開サポート（新機能対応）
  pause(): boolean {
    if (this.state === 'listening') {
      this.previousState = this.state;
      this.setState('paused', 'User requested pause');
      return true;
    }
    return false;
  }
  
  resume(): boolean {
    if (this.state === 'paused' && this.previousState) {
      this.setState(this.previousState, 'User requested resume');
      return true;
    }
    return false;
  }
  
  isPaused(): boolean {
    return this.state === 'paused';
  }
  
  // メトリクス
  getUptime(): number {
    return this.startTime > 0 ? Date.now() - this.startTime : 0;
  }
  
  getIdleTime(): number {
    return this.lastActivityTime > 0 ? Date.now() - this.lastActivityTime : 0;
  }
  
  // 内部処理
  private onStateChange(oldState: PipelineState, newState: PipelineState): void {
    if (newState === 'starting') {
      this.startTime = Date.now();
    } else if (newState === 'idle') {
      this.startTime = 0;
      this.correlationId = null;
    }
  }
  
  // デバッグ支援
  getStateHistory(limit: number = 10): StateTransition[] {
    return this.stateHistory.slice(-limit);
  }
}
```

## 📋 実装手順

### Step 1: PipelineStateManagerクラスの作成
1. 新規ファイル作成: `electron/services/domain/PipelineStateManager.ts`
2. 上記の設計を実装
3. ユニットテスト作成

### Step 2: UnifiedPipelineServiceの修正
1. **バックアップ作成**（重要）
2. PipelineStateManagerのインポート
3. 既存の状態管理コードを置き換え

```typescript
// 変更前
private state: PipelineState = 'idle';
private setState(newState: PipelineState): void { ... }

// 変更後
private stateManager: PipelineStateManager;

constructor(...) {
  this.stateManager = new PipelineStateManager();
}

// 使用例
if (this.stateManager.getState() !== 'idle') {
  throw new Error(`Cannot start listening in state: ${this.stateManager.getState()}`);
}
```

### Step 3: 既存メソッドの更新

```typescript
// getState()メソッドの更新
getState(): {...} {
  const state = this.stateManager.getState();
  return {
    state,
    sourceLanguage: this.sourceLanguage,
    targetLanguage: this.targetLanguage,
    segmentCount: this.transcriptSegments.length,
    translationCount: this.translations.length,
    summaryCount: this.summaries.length,
    uptime: this.stateManager.getUptime()
  };
}
```

## ✅ 実装チェックリスト

### 実装前
- [ ] UnifiedPipelineServiceのバックアップ作成
- [ ] 既存の状態管理コードを完全に把握
- [ ] OpenAI/Deepgram呼び出しに影響しないことを確認

### 実装中
- [ ] PipelineStateManagerクラス作成
- [ ] ユニットテスト作成
- [ ] UnifiedPipelineServiceでの統合
- [ ] 既存の状態遷移ロジックが保持されているか確認

### 実装後
- [ ] Deepgramモデルが `nova-3` のまま変更されていないか
- [ ] GPT-5シリーズのモデル名が保持されているか
- [ ] responses.create APIが引き続き使用されているか
- [ ] 全テストが通過するか
- [ ] 状態遷移が正しく動作するか

## 🎯 期待される成果

1. **コード削減**: UnifiedPipelineService から約100行削減
2. **責任分離**: 状態管理が独立したクラスに
3. **テスタビリティ向上**: 状態管理を単独でテスト可能
4. **一時停止/再開の準備**: pausedステートのサポート

## ⚠️ リスクと対策

### リスク1: 状態遷移の破壊
**対策**: 既存の状態遷移ロジックを完全に移植し、テストで検証

### リスク2: イベント発行タイミングのずれ
**対策**: setState時のイベント発行タイミングを維持

### リスク3: 誤ってAPI呼び出しを変更
**対策**: 状態管理のみに集中し、API呼び出しには触れない