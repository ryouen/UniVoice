/**
 * Pipeline State Manager
 * 
 * UnifiedPipelineServiceから状態管理ロジックを分離
 * 一時停止/再開機能をサポート
 * 
 * 🔴 注意: このクラスはOpenAI/Deepgramの設定には一切触れない
 */

import { logger } from '../../utils/logger';

export type PipelineState = 'idle' | 'starting' | 'listening' | 'processing' | 'stopping' | 'error' | 'paused';

export interface StateTransition {
  from: PipelineState;
  to: PipelineState;
  timestamp: number;
  reason?: string;
}

export interface PipelineStateInfo {
  state: PipelineState;
  correlationId: string | null;
  startTime: number;
  lastActivityTime: number;
  uptime: number;
  isPaused: boolean;
}

export class PipelineStateManager {
  private state: PipelineState = 'idle';
  private previousState?: PipelineState;
  private currentCorrelationId: string | null = null;
  private startTime: number = 0;
  private lastActivityTime: number = 0;
  private stateHistory: StateTransition[] = [];
  
  private componentLogger = logger.child('PipelineStateManager');
  
  // 状態遷移の妥当性マップ
  private readonly validTransitions: Record<PipelineState, PipelineState[]> = {
    'idle': ['starting'],
    'starting': ['listening', 'error', 'idle'],
    'listening': ['processing', 'stopping', 'error', 'paused'],
    'processing': ['listening', 'stopping', 'error'],
    'stopping': ['idle', 'error'],
    'error': ['idle'],
    'paused': ['listening', 'stopping', 'idle']
  };
  
  /**
   * 現在の状態を取得
   */
  getState(): PipelineState {
    return this.state;
  }
  
  /**
   * 状態情報の詳細を取得
   */
  getStateInfo(): PipelineStateInfo {
    return {
      state: this.state,
      correlationId: this.currentCorrelationId,
      startTime: this.startTime,
      lastActivityTime: this.lastActivityTime,
      uptime: this.getUptime(),
      isPaused: this.isPaused()
    };
  }
  
  /**
   * 状態を設定（既存のsetStateメソッドと互換）
   */
  setState(newState: PipelineState, correlationId?: string, reason?: string): void {
    if (!this.canTransitionTo(newState)) {
      throw new Error(`Invalid state transition: ${this.state} -> ${newState}`);
    }
    
    const oldState = this.state;
    this.state = newState;
    
    // correlationIdの管理
    if (correlationId !== undefined) {
      this.currentCorrelationId = correlationId;
    }
    
    // 履歴に記録
    this.stateHistory.push({
      from: oldState,
      to: newState,
      timestamp: Date.now(),
      reason
    });
    
    // 状態変更時の処理
    this.onStateChange(oldState, newState);
    
    // ログ出力（既存のUnifiedPipelineServiceと同じ形式）
    this.componentLogger.info('Pipeline state changed', {
      from: oldState,
      to: newState,
      correlationId: this.currentCorrelationId
    });
  }
  
  /**
   * 特定の状態への遷移が可能かチェック
   */
  canTransitionTo(newState: PipelineState): boolean {
    return this.validTransitions[this.state]?.includes(newState) ?? false;
  }
  
  /**
   * 一時停止
   */
  pause(): boolean {
    if (this.state === 'listening' && this.canTransitionTo('paused')) {
      this.previousState = this.state;
      this.setState('paused', undefined, 'User requested pause');
      return true;
    }
    this.componentLogger.warn('Cannot pause in current state', { currentState: this.state });
    return false;
  }
  
  /**
   * 再開
   */
  resume(): boolean {
    if (this.state === 'paused') {
      const targetState = this.previousState || 'listening';
      if (this.canTransitionTo(targetState)) {
        this.setState(targetState, undefined, 'User requested resume');
        this.previousState = undefined;
        return true;
      }
    }
    this.componentLogger.warn('Cannot resume in current state', { currentState: this.state });
    return false;
  }
  
  /**
   * 一時停止中かどうか
   */
  isPaused(): boolean {
    return this.state === 'paused';
  }
  
  /**
   * アクティビティを記録
   */
  updateActivity(): void {
    this.lastActivityTime = Date.now();
  }
  
  /**
   * 起動時間を取得
   */
  getUptime(): number {
    return this.startTime > 0 ? Date.now() - this.startTime : 0;
  }
  
  /**
   * アイドル時間を取得
   */
  getIdleTime(): number {
    return this.lastActivityTime > 0 ? Date.now() - this.lastActivityTime : 0;
  }
  
  /**
   * 現在のcorrelationIdを取得
   */
  getCorrelationId(): string | null {
    return this.currentCorrelationId;
  }
  
  /**
   * correlationIdを設定
   */
  setCorrelationId(correlationId: string | null): void {
    this.currentCorrelationId = correlationId;
  }
  
  /**
   * 状態履歴を取得（デバッグ用）
   */
  getStateHistory(limit: number = 10): StateTransition[] {
    return this.stateHistory.slice(-limit);
  }
  
  /**
   * リセット
   */
  reset(): void {
    this.state = 'idle';
    this.previousState = undefined;
    this.currentCorrelationId = null;
    this.startTime = 0;
    this.lastActivityTime = 0;
    this.stateHistory = [];
  }
  
  /**
   * 状態変更時の内部処理
   */
  private onStateChange(_oldState: PipelineState, newState: PipelineState): void {
    // starting状態になったら開始時刻を記録
    if (newState === 'starting') {
      this.startTime = Date.now();
    }
    
    // idle状態に戻ったらリセット
    if (newState === 'idle') {
      this.startTime = 0;
      this.currentCorrelationId = null;
    }
    
    // listening状態になったらアクティビティを更新
    if (newState === 'listening') {
      this.updateActivity();
    }
  }
}