/**
 * SyncedRealtimeDisplayManager - 左右同期型リアルタイム表示管理
 * 
 * 設計原則:
 * 1. interim results (final=false) は一切表示しない
 * 2. 原文と翻訳を左右同じ高さで表示
 * 3. 翻訳完了後1.5秒で両方同時に削除
 * 4. 最大3ペア表示（opacity: 0.3, 0.6, 1.0）
 * 
 * @author Claude Code (Senior Engineer Mode with DEEP-THINK)
 */

export interface SyncedDisplayPair {
  id: string;
  original: {
    text: string;
    isFinal: boolean;
    timestamp: number;
  };
  translation: {
    text: string;
    isComplete: boolean;
    timestamp: number;
  };
  display: {
    startTime: number;              // Final確定時刻
    translationCompleteTime?: number; // 翻訳完了時刻
    scheduledRemovalTime?: number;    // 削除予定時刻
    height: number;                   // 左右統一高さ
    position: 'recent' | 'older' | 'oldest'; // 表示位置
    opacity: number;                  // 透明度
  };
  segmentId?: string; // ASRセグメントとの紐付け用
}

export class SyncedRealtimeDisplayManager {
  private displayPairs: SyncedDisplayPair[] = [];
  private maxDisplayPairs = 3;
  private minDisplayTimeMs = 1500; // 翻訳完了後の最小表示時間
  private updateTimer: NodeJS.Timeout | null = null;
  private pendingOriginals = new Map<string, string>(); // interim結果の一時保存
  
  constructor(
    private onUpdate: (pairs: SyncedDisplayPair[]) => void
  ) {
    // 50msごとに表示状態を更新（削除タイミング管理）
    this.updateTimer = setInterval(() => this.checkRemovalSchedule(), 50);
  }
  
  /**
   * 原文を更新（interim結果は表示しない）
   */
  updateOriginal(text: string, isFinal: boolean, segmentId?: string): void {
    if (!text) return;
    
    // interim結果は表示しない（ユーザーの要望により）
    if (!isFinal) {
      console.log('[SyncedRealtimeDisplayManager] Skipping interim result:', {
        textLength: text.length,
        segmentId
      });
      return; // interim結果は完全にスキップ
    }
    
    // Final結果を受信
    console.log('[SyncedRealtimeDisplayManager] Final result received:', {
      text: text.substring(0, 50) + '...',
      segmentId,
      existingPairsCount: this.displayPairs.length
    });
    
    // 新しいペアを作成
    const now = Date.now();
    const newPair: SyncedDisplayPair = {
      id: segmentId || `pair_${now}`,
      original: {
        text: text,
        isFinal: true,
        timestamp: now
      },
      translation: {
        text: '',
        isComplete: false,
        timestamp: 0
      },
      display: {
        startTime: now,
        height: this.calculateHeight(text),
        position: 'recent',
        opacity: 1.0
      },
      ...(segmentId ? { segmentId } : {})
    };
    
    // 既存ペアの位置を調整
    this.shiftPairPositions();
    
    // 新しいペアを追加
    this.displayPairs.unshift(newPair);
    console.log('[SyncedRealtimeDisplayManager] New pair added:', {
      pairId: newPair.id,
      totalPairs: this.displayPairs.length,
      positions: this.displayPairs.slice(0, 3).map(p => ({
        id: p.id,
        position: p.display.position,
        text: p.original.text.substring(0, 20) + '...'
      }))
    });
    
    // 最大表示数を超えたら、最小表示時間を満たした古いものから削除
    if (this.displayPairs.length > this.maxDisplayPairs) {
      const now = Date.now();
      const removablePairs: SyncedDisplayPair[] = [];
      const keepPairs: SyncedDisplayPair[] = [];
      
      // 最新のペア以外をチェック（最新は必ず残す）
      this.displayPairs.slice(1).forEach(pair => {
        // 翻訳完了かつ最小表示時間経過したものは削除可能
        if (pair.translation.isComplete && 
            pair.display.translationCompleteTime &&
            now - pair.display.translationCompleteTime >= this.minDisplayTimeMs) {
          removablePairs.push(pair);
        } else {
          keepPairs.push(pair);
        }
      });
      
      // 最新のペアを含めて、最大表示数に収める
      const allPairs = [this.displayPairs[0], ...keepPairs, ...removablePairs];
      this.displayPairs = allPairs.slice(0, this.maxDisplayPairs);
    }
    
    // 位置を更新
    this.updatePairPositions();
    
    // pendingから削除
    if (segmentId) {
      this.pendingOriginals.delete(segmentId);
    }
    
    this.emitUpdate();
  }
  
  /**
   * 翻訳を更新（対応する原文ペアに追加）
   */
  updateTranslation(text: string, segmentId?: string): void {
    if (!text) return;
    
    // segmentIdで対応するペアを探す
    let targetPair: SyncedDisplayPair | undefined;
    
    if (segmentId) {
      // history_プレフィックスを削除して基本IDを取得
      const baseId = segmentId.replace(/^(history_|paragraph_)/, '');
      
      // まず元のsegmentIdで検索し、見つからなければbaseIdで検索
      targetPair = this.displayPairs.find(p => p.segmentId === segmentId) ||
                   this.displayPairs.find(p => p.segmentId === baseId);
      
      if (segmentId !== baseId) {
        console.log(`[SyncedDisplayManager] History/Paragraph translation: ${segmentId} → ${baseId}`);
      }
      
      // 既に完了している場合はスキップ（重複翻訳イベント対策）
      if (targetPair && targetPair.translation.isComplete) {
        console.log(`[SyncedDisplayManager] SegmentID ${segmentId} は既に翻訳済みです`);
        return;
      }
    }
    
    // segmentIdで見つからない場合は、翻訳が未完了の最も古いペアを探す
    if (!targetPair) {
      targetPair = this.displayPairs
        .filter(p => !p.translation.isComplete)
        .sort((a, b) => a.display.startTime - b.display.startTime)[0];
    }
    
    if (!targetPair) {
      // 重複イベントの可能性が高いので、warnからlogに変更
      console.log(`[SyncedDisplayManager] SegmentID ${segmentId} に対応する未翻訳ペアが見つかりません`);
      return;
    }
    
    const now = Date.now();
    
    // 翻訳を更新
    targetPair.translation.text = text;
    targetPair.translation.timestamp = now;
    
    // 高さを再計算（翻訳テキストを考慮）
    targetPair.display.height = Math.max(
      this.calculateHeight(targetPair.original.text),
      this.calculateHeight(text)
    );
    
    this.emitUpdate();
  }
  
  /**
   * 翻訳を完了としてマーク（削除スケジュール開始）
   */
  completeTranslation(segmentId?: string): void {
    let targetPair: SyncedDisplayPair | undefined;
    
    if (segmentId) {
      // history_プレフィックスを削除して基本IDを取得
      const baseId = segmentId.replace(/^(history_|paragraph_)/, '');
      
      // まず元のsegmentIdで検索し、見つからなければbaseIdで検索
      targetPair = this.displayPairs.find(p => p.segmentId === segmentId) ||
                   this.displayPairs.find(p => p.segmentId === baseId);
    } else {
      targetPair = this.displayPairs.find(p => !p.translation.isComplete);
    }
    
    if (!targetPair) return;
    
    const now = Date.now();
    targetPair.translation.isComplete = true;
    targetPair.display.translationCompleteTime = now;
    // 削除スケジュールは設定しない - 表示を維持
    // targetPair.display.scheduledRemovalTime = now + this.minDisplayTimeMs;
    
    console.log(`[SyncedDisplayManager] 翻訳完了、表示を維持`);
    
    this.emitUpdate();
  }
  
  /**
   * 削除スケジュールをチェック
   */
  private checkRemovalSchedule(): void {
    // 自動削除は行わない - 表示を維持
    // 新しいペアが追加された時のみ、最小表示時間を考慮して古いものを削除
  }
  
  /**
   * ペアの表示位置をシフト（新しいペアが追加される前に呼ばれる）
   */
  private shiftPairPositions(): void {
    // 既存のペアを古い方向にシフト
    this.displayPairs.forEach((pair, index) => {
      if (index === 0) {
        // 現在のrecentはolderになる
        pair.display.position = 'older';
        pair.display.opacity = 0.6;
      } else if (index === 1) {
        // 現在のolderはoldestになる
        pair.display.position = 'oldest';
        pair.display.opacity = 0.3;
      }
      // index >= 2 は削除対象
    });
  }
  
  /**
   * ペアの表示位置を更新
   */
  private updatePairPositions(): void {
    this.displayPairs.forEach((pair, index) => {
      switch (index) {
        case 0:
          pair.display.position = 'recent';
          pair.display.opacity = 1.0;
          break;
        case 1:
          pair.display.position = 'older';
          pair.display.opacity = 0.6;
          break;
        case 2:
          pair.display.position = 'oldest';
          pair.display.opacity = 0.3;
          break;
      }
    });
  }
  
  /**
   * テキストの高さを計算（文字数ベース）
   */
  private calculateHeight(text: string): number {
    if (!text) return 24; // 最小高さ
    
    // 1行あたり約40文字として計算
    const lines = Math.ceil(text.length / 40);
    const lineHeight = 24; // 1行の高さ(px)
    const padding = 16; // 上下パディング
    
    return lines * lineHeight + padding;
  }
  
  /**
   * 更新を通知
   */
  private emitUpdate(): void {
    // 位置を更新してから通知
    this.updatePairPositions();
    
    // 表示用に整形したペアを送信
    const displayPairs = this.displayPairs.map(pair => ({
      ...pair,
      // 表示位置に基づく追加情報をここで付与可能
    }));
    
    this.onUpdate(displayPairs);
  }
  
  /**
   * 全てリセット
   */
  reset(): void {
    this.displayPairs = [];
    this.pendingOriginals.clear();
    this.emitUpdate();
  }
  
  /**
   * リソースをクリーンアップ
   */
  destroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    this.reset();
  }
  
  /**
   * 現在の表示ペアを取得
   */
  getDisplayPairs(): SyncedDisplayPair[] {
    return [...this.displayPairs];
  }
  
  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): {
    displayPairs: number;
    pendingOriginals: number;
    scheduledRemovals: number;
  } {
    return {
      displayPairs: this.displayPairs.length,
      pendingOriginals: this.pendingOriginals.size,
      scheduledRemovals: this.displayPairs.filter(p => p.display.scheduledRemovalTime).length
    };
  }
}