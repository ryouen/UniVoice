/**
 * 翻訳タイムアウト問題の自動診断ツール
 */

interface TimeoutDebugInfo {
  segmentId: string;
  startTime: number;
  cleared: boolean;
  timedOut: boolean;
  translationReceived: boolean;
  translationTime?: number;
  clearAttemptTime?: number;
}

export class TranslationTimeoutDebugger {
  private static instance: TranslationTimeoutDebugger;
  private debugInfo = new Map<string, TimeoutDebugInfo>();
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new TranslationTimeoutDebugger();
    }
    return this.instance;
  }
  
  // タイムアウト開始を記録
  recordTimeoutStart(segmentId: string) {
    this.debugInfo.set(segmentId, {
      segmentId,
      startTime: Date.now(),
      cleared: false,
      timedOut: false,
      translationReceived: false
    });
    console.log(`🟢 [TIMEOUT DEBUGGER] Timeout started for: ${segmentId}`);
  }
  
  // 翻訳受信を記録
  recordTranslationReceived(segmentId: string, isFinal: boolean) {
    const info = this.debugInfo.get(segmentId);
    if (info) {
      info.translationReceived = true;
      info.translationTime = Date.now() - info.startTime;
      console.log(`🟡 [TIMEOUT DEBUGGER] Translation received for: ${segmentId}, isFinal: ${isFinal}, time: ${info.translationTime}ms`);
    } else {
      console.log(`🔴 [TIMEOUT DEBUGGER] Translation received for unknown segment: ${segmentId}`);
    }
  }
  
  // タイムアウトクリアを記録
  recordTimeoutClear(segmentId: string, success: boolean) {
    const info = this.debugInfo.get(segmentId);
    if (info) {
      info.cleared = success;
      info.clearAttemptTime = Date.now() - info.startTime;
      console.log(`🟣 [TIMEOUT DEBUGGER] Clear attempt for: ${segmentId}, success: ${success}, time: ${info.clearAttemptTime}ms`);
    }
  }
  
  // タイムアウト発生を記録
  recordTimeoutFired(segmentId: string) {
    const info = this.debugInfo.get(segmentId);
    if (info) {
      info.timedOut = true;
      const timeElapsed = Date.now() - info.startTime;
      console.log(`🔴 [TIMEOUT DEBUGGER] TIMEOUT FIRED for: ${segmentId} after ${timeElapsed}ms`);
      this.printSegmentSummary(segmentId);
    }
  }
  
  // セグメントのサマリーを出力
  printSegmentSummary(segmentId: string) {
    const info = this.debugInfo.get(segmentId);
    if (!info) return;
    
    console.log('=================== TIMEOUT DEBUG SUMMARY ===================');
    console.log(`Segment ID: ${segmentId}`);
    console.log(`Translation Received: ${info.translationReceived}`);
    console.log(`Translation Time: ${info.translationTime || 'N/A'}ms`);
    console.log(`Clear Attempted: ${info.cleared !== false}`);
    console.log(`Clear Success: ${info.cleared}`);
    console.log(`Clear Attempt Time: ${info.clearAttemptTime || 'N/A'}ms`);
    console.log(`Timed Out: ${info.timedOut}`);
    console.log('===========================================================');
  }
  
  // 全体のサマリーを出力
  printFullReport() {
    console.log('\n🔍 FULL TIMEOUT DEBUG REPORT 🔍');
    console.log(`Total segments: ${this.debugInfo.size}`);
    
    let timedOutCount = 0;
    let clearedCount = 0;
    let translationReceivedCount = 0;
    
    this.debugInfo.forEach(info => {
      if (info.timedOut) timedOutCount++;
      if (info.cleared) clearedCount++;
      if (info.translationReceived) translationReceivedCount++;
    });
    
    console.log(`Timed out: ${timedOutCount}`);
    console.log(`Successfully cleared: ${clearedCount}`);
    console.log(`Translations received: ${translationReceivedCount}`);
    console.log('\nDetailed info for timed out segments:');
    
    this.debugInfo.forEach(info => {
      if (info.timedOut) {
        this.printSegmentSummary(info.segmentId);
      }
    });
  }
}

// グローバルに公開（デバッグ用）
(window as any).timeoutDebugger = TranslationTimeoutDebugger.getInstance();