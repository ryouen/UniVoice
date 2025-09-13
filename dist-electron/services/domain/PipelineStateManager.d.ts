/**
 * Pipeline State Manager
 *
 * UnifiedPipelineServiceから状態管理ロジックを分離
 * 一時停止/再開機能をサポート
 *
 * 🔴 注意: このクラスはOpenAI/Deepgramの設定には一切触れない
 */
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
export declare class PipelineStateManager {
    private state;
    private previousState?;
    private currentCorrelationId;
    private startTime;
    private lastActivityTime;
    private stateHistory;
    private componentLogger;
    private readonly validTransitions;
    /**
     * 現在の状態を取得
     */
    getState(): PipelineState;
    /**
     * 状態情報の詳細を取得
     */
    getStateInfo(): PipelineStateInfo;
    /**
     * 状態を設定（既存のsetStateメソッドと互換）
     */
    setState(newState: PipelineState, correlationId?: string, reason?: string): void;
    /**
     * 特定の状態への遷移が可能かチェック
     */
    canTransitionTo(newState: PipelineState): boolean;
    /**
     * 一時停止
     */
    pause(): boolean;
    /**
     * 再開
     */
    resume(): boolean;
    /**
     * 一時停止中かどうか
     */
    isPaused(): boolean;
    /**
     * アクティビティを記録
     */
    updateActivity(): void;
    /**
     * 起動時間を取得
     */
    getUptime(): number;
    /**
     * アイドル時間を取得
     */
    getIdleTime(): number;
    /**
     * 現在のcorrelationIdを取得
     */
    getCorrelationId(): string | null;
    /**
     * correlationIdを設定
     */
    setCorrelationId(correlationId: string | null): void;
    /**
     * 状態履歴を取得（デバッグ用）
     */
    getStateHistory(limit?: number): StateTransition[];
    /**
     * リセット
     */
    reset(): void;
    /**
     * 状態変更時の内部処理
     */
    private onStateChange;
}
