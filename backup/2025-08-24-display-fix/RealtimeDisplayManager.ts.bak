/**
 * Realtime Display Manager
 * リアルタイムウィンドウの複数行対比表示を管理
 */

export interface DisplaySegment {
  id: string;
  original: string;
  translation: string;
  status: 'active' | 'fading' | 'completed';
  timestamp: number;
  displayStartTime?: number;  // 表示開始時刻（最小表示時間管理用）
  translationStartTime?: number; // 翻訳表示開始時刻（1.5秒維持用）
  opacity?: number;           // 透明度（フェードイン/アウト用）
  isFinal?: boolean;          // Final結果かどうか
  originalIsFinal?: boolean;  // 原文がFinalかどうか
  translationStarted?: boolean; // 翻訳が開始されたかどうか
  pairIndex?: number;         // 左右対応用のペアインデックス
}

export class RealtimeDisplayManager {
  private segments: DisplaySegment[] = [];
  private maxDisplaySegments = 3; // 最大3行表示
  private currentSegmentId: string | null = null;
  private minDisplayTimeMs = 1500; // 最小表示時間1.5秒（調査結果推奨値）
  private translationDisplayTimeMs = 1500; // 翻訳表示後の最小維持時間1.5秒
  private fadeInDurationMs = 200;  // フェードイン時間
  private fadeOutDurationMs = 300; // フェードアウト時間
  private updateTimer: NodeJS.Timeout | null = null;
  private similarityThreshold = 0.7; // 70%以上の類似度で同一とみなす（継続性重視）
  
  constructor(
    private onUpdate: (segments: DisplaySegment[]) => void
  ) {
    // 定期的に表示状態を更新（フェードアニメーション用）
    this.updateTimer = setInterval(() => this.updateDisplayStates(), 50);
  }
  
  /**
   * 新しい原文を追加または更新
   * @param text 原文テキスト
   * @param isFinal Final結果かどうか（Deepgramのis_final）
   */
  updateOriginal(text: string, isFinal: boolean = false): void {
    if (!text) return;
    
    const now = Date.now();
    
    // まず現在のセグメントをチェック（Final結果でない限り同じセグメントを更新）
    if (this.currentSegmentId && !isFinal) {
      const currentSegment = this.segments.find(s => s.id === this.currentSegmentId);
      if (currentSegment && !currentSegment.isFinal) {
        // 現在のセグメントがFinalでなければ、常に更新
        currentSegment.original = text;
        currentSegment.timestamp = now;
        this.emitUpdate();
        return;
      }
    }
    
    // 既存のセグメントと比較して類似度をチェック
    const similarSegment = this.findSimilarSegment(text);
    
    if (similarSegment) {
      // 類似セグメントが見つかった場合は更新
      console.log(`📝 [DisplayManager] 類似セグメント発見: "${text}" → セグメント${similarSegment.id}`);
      if (isFinal) {
        // Final結果で更新（より正確なテキストに置き換え）
        console.log(`✅ [DisplayManager] Final結果で更新: "${similarSegment.original}" → "${text}"`);
        similarSegment.original = text;
        similarSegment.isFinal = true;
        similarSegment.originalIsFinal = true;
        similarSegment.timestamp = now;
        // 現在のセグメントIDを更新
        this.currentSegmentId = similarSegment.id;
      } else if (!similarSegment.isFinal) {
        // Interim結果同士の場合のみ更新
        console.log(`🔄 [DisplayManager] Interim結果で更新: "${similarSegment.original}" → "${text}"`);
        similarSegment.original = text;
        similarSegment.timestamp = now;
        this.currentSegmentId = similarSegment.id;
      } else {
        console.log(`⚠️ [DisplayManager] Final結果があるためInterim結果を無視: "${text}"`);
      }
      // Final結果がある場合、Interim結果で上書きしない
    } else {
      // 類似セグメントがない場合
      console.log(`🆕 [DisplayManager] 新しいテキスト: "${text}" (isFinal: ${isFinal})`);
      if (isFinal) {
        // Final結果は必ず新しいセグメントとして扱う
        console.log(`✅ [DisplayManager] Final結果で新しいセグメント作成`);
        this.startNewSegment(text, isFinal);
      } else if (this.currentSegmentId) {
        const segment = this.segments.find(s => s.id === this.currentSegmentId);
        if (segment) {
          // 大幅にテキストが短くなった場合のみ新しいセグメント
          if (text.length < segment.original.length * 0.3) {
            // 70%以上短くなった場合は新しい発話と判断
            console.log(`🔀 [DisplayManager] 大幅短縮で新セグメント: ${text.length} < ${segment.original.length * 0.3}`);
            this.startNewSegment(text, isFinal);
          } else {
            // そうでなければ更新
            console.log(`🔄 [DisplayManager] 現在セグメントを更新: "${segment.original}" → "${text}"`);
            segment.original = text;
            segment.timestamp = now;
          }
        }
      } else {
        // 初回は新規作成
        console.log(`🎬 [DisplayManager] 初回セグメント作成`);
        this.startNewSegment(text, isFinal);
      }
    }
    
    this.emitUpdate();
  }
  
  /**
   * 翻訳を更新（左右対応重視）
   */
  updateTranslation(text: string): void {
    if (!text) return;
    
    const now = Date.now();
    
    // 左右対応の原則：原文がFinalになったセグメントのみ翻訳可能
    const finalSegments = this.segments.filter(s => 
      (s.status === 'active' || s.status === 'fading') && 
      s.originalIsFinal && 
      !s.translation
    );
    
    // Finalな原文に対する翻訳を優先
    if (finalSegments.length > 0) {
      const targetSegment = finalSegments[0]; // 最初のFinalセグメント
      targetSegment.translation = text;
      targetSegment.translationStarted = true;
      targetSegment.translationStartTime = now; // 翻訳開始時刻を記録
      targetSegment.timestamp = now;
      this.emitUpdate();
      return;
    }
    
    // 既存の翻訳の継続更新をチェック
    const existingSegmentWithSimilarTranslation = this.findSegmentWithSimilarTranslation(text);
    
    if (existingSegmentWithSimilarTranslation) {
      // 類似の翻訳を持つセグメントを更新
      existingSegmentWithSimilarTranslation.translation = text;
      // 翻訳開始時刻は初回のみ設定
      if (!existingSegmentWithSimilarTranslation.translationStartTime) {
        existingSegmentWithSimilarTranslation.translationStartTime = now;
      }
      existingSegmentWithSimilarTranslation.timestamp = now;
      this.emitUpdate();
      return;
    }
    
    // 翻訳が開始されているセグメントを更新
    const translationStartedSegments = this.segments.filter(s => 
      (s.status === 'active' || s.status === 'fading') && 
      s.translationStarted && 
      s.translation
    );
    
    if (translationStartedSegments.length > 0) {
      const mostRecentSegment = translationStartedSegments[translationStartedSegments.length - 1];
      mostRecentSegment.translation = text;
      // 翻訳開始時刻は初回のみ設定
      if (!mostRecentSegment.translationStartTime) {
        mostRecentSegment.translationStartTime = now;
      }
      mostRecentSegment.timestamp = now;
      this.emitUpdate();
      return;
    }
    
    // 最後の手段：空の翻訳セグメントに割り当て
    const emptyTranslationSegments = this.segments.filter(s => 
      (s.status === 'active' || s.status === 'fading') && !s.translation
    );
    
    if (emptyTranslationSegments.length > 0) {
      const targetSegment = emptyTranslationSegments[0];
      targetSegment.translation = text;
      targetSegment.translationStarted = true;
      targetSegment.translationStartTime = now; // 翻訳開始時刻を記録
      targetSegment.timestamp = now;
    }
    
    this.emitUpdate();
  }
  
  /**
   * 現在のセグメントを完了
   */
  completeCurrentSegment(): void {
    if (this.currentSegmentId) {
      const segment = this.segments.find(s => s.id === this.currentSegmentId);
      if (segment) {
        segment.status = 'completed';
      }
      this.currentSegmentId = null;
    }
    
    // 古いセグメントをフェードアウト
    this.updateSegmentStates();
    this.emitUpdate();
  }
  
  /**
   * 新しいセグメントを開始
   */
  private startNewSegment(originalText: string, isFinal: boolean = false): void {
    // 現在のセグメントを完了
    if (this.currentSegmentId) {
      this.completeCurrentSegment();
    }
    
    const now = Date.now();
    
    // ペアインデックスを計算（左右対応用）
    const nextPairIndex = this.segments.length > 0 
      ? Math.max(...this.segments.map(s => s.pairIndex || 0)) + 1 
      : 0;
    
    // 新しいセグメントを作成
    const newSegment: DisplaySegment = {
      id: `seg_${now}`,
      original: originalText,
      translation: '',
      status: 'active',
      timestamp: now,
      displayStartTime: now,  // 表示開始時刻を記録
      opacity: 0,            // フェードインのため初期値は0
      isFinal: isFinal,
      originalIsFinal: isFinal,
      translationStarted: false,
      pairIndex: nextPairIndex // 左右対応用のペアインデックス
    };
    
    this.segments.push(newSegment);
    this.currentSegmentId = newSegment.id;
    
    // 表示数を制限（古いセグメントを削除）
    if (this.segments.length > this.maxDisplaySegments) {
      // 最小表示時間を考慮して削除
      const removableSegments = this.segments.filter(s => {
        const displayTime = now - (s.displayStartTime || s.timestamp);
        return displayTime > this.minDisplayTimeMs && s.status === 'completed';
      });
      
      if (removableSegments.length > 0) {
        const removeCount = this.segments.length - this.maxDisplaySegments;
        this.segments = this.segments.slice(removeCount);
      }
    }
    
    this.updateSegmentStates();
  }
  
  /**
   * セグメントの状態を更新
   */
  private updateSegmentStates(): void {
    // アクティブなセグメント以外をフェーディングに
    this.segments.forEach((segment) => {
      if (segment.id !== this.currentSegmentId && segment.status !== 'completed') {
        segment.status = 'fading';
      }
    });
  }
  
  /**
   * 更新を通知
   */
  private emitUpdate(): void {
    // 表示用に整形したセグメントを送信
    const displaySegments = this.segments.map((segment) => ({
      ...segment,
      // 古いセグメントほど透明度を上げる
      opacity: segment.status === 'active' ? 1 : 
               segment.status === 'fading' ? 0.6 : 0.4
    }));
    
    this.onUpdate(displaySegments);
  }
  
  /**
   * 表示状態を定期的に更新（フェードアニメーション処理）
   */
  private updateDisplayStates(): void {
    const now = Date.now();
    let needsUpdate = false;
    
    this.segments.forEach(segment => {
      const age = now - segment.timestamp;
      const displayTime = now - (segment.displayStartTime || segment.timestamp);
      
      // 翻訳表示後1.5秒維持のチェック
      if (segment.translation && segment.translationStartTime) {
        const translationDisplayTime = now - segment.translationStartTime;
        
        // 翻訳表示後1.5秒経過していない場合は強制的にactiveまたはfadingに維持
        if (translationDisplayTime < this.translationDisplayTimeMs) {
          if (segment.status === 'completed') {
            // completedになりそうでも、翻訳表示時間内はfadingに戻す
            segment.status = 'fading';
            needsUpdate = true;
          }
        }
      }
      
      // フェードイン処理
      if (segment.status === 'active' && segment.opacity !== undefined && segment.opacity < 1) {
        const fadeProgress = Math.min(age / this.fadeInDurationMs, 1);
        segment.opacity = fadeProgress;
        needsUpdate = true;
      }
      
      // フェードアウト処理
      if (segment.status === 'fading' && segment.opacity !== undefined && segment.opacity > 0.6) {
        const fadeProgress = Math.min(age / this.fadeOutDurationMs, 1);
        segment.opacity = Math.max(0.6, 1 - fadeProgress * 0.4);
        needsUpdate = true;
      }
      
      // 古いセグメントの自動削除（最小表示時間後）
      // ただし、翻訳表示後1.5秒は削除しない
      const canDelete = segment.status === 'completed' && 
                       displayTime > this.minDisplayTimeMs * 2;
      
      if (segment.translation && segment.translationStartTime) {
        const translationDisplayTime = now - segment.translationStartTime;
        if (translationDisplayTime < this.translationDisplayTimeMs) {
          // 翻訳表示後1.5秒以内は削除しない
          return;
        }
      }
      
      if (canDelete) {
        const index = this.segments.indexOf(segment);
        if (index > -1 && this.segments.length > this.maxDisplaySegments) {
          this.segments.splice(index, 1);
          needsUpdate = true;
        }
      }
    });
    
    if (needsUpdate) {
      this.emitUpdate();
    }
  }
  
  /**
   * 全てリセット
   */
  reset(): void {
    this.segments = [];
    this.currentSegmentId = null;
    this.emitUpdate();
  }
  
  /**
   * リソースをクリーンアップ（メモリリーク防止）
   */
  destroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    this.reset();
  }
  
  /**
   * 現在の表示セグメントを取得
   */
  getSegments(): DisplaySegment[] {
    return [...this.segments];
  }
  
  /**
   * テキストの類似度を計算（冒頭単語一致重視）
   */
  private calculateSimilarity(text1: string, text2: string): number {
    // 正規化（小文字化、空白の統一）
    const norm1 = text1.toLowerCase().replace(/\s+/g, ' ').trim();
    const norm2 = text2.toLowerCase().replace(/\s+/g, ' ').trim();
    
    // 完全一致
    if (norm1 === norm2) return 1.0;
    
    // 空文字列チェック
    if (!norm1 || !norm2) return 0;
    
    const words1 = norm1.split(' ').filter(w => w.length > 0);
    const words2 = norm2.split(' ').filter(w => w.length > 0);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    // 冒頭の単語一致チェック（最重要）
    let commonFromStart = 0;
    const minWords = Math.min(words1.length, words2.length);
    
    for (let i = 0; i < minWords; i++) {
      if (words1[i] === words2[i]) {
        commonFromStart++;
      } else {
        break;
      }
    }
    
    // 冒頭3単語以上が一致している場合は継続とみなす
    if (commonFromStart >= 3) {
      return 0.95;
    }
    
    // 冒頭2単語が一致している場合
    if (commonFromStart >= 2) {
      return 0.9;
    }
    
    // 冒頭1単語のみ一致の場合は、全体の類似度も考慮
    if (commonFromStart >= 1) {
      const longer = words1.length > words2.length ? words1 : words2;
      const shorter = words1.length > words2.length ? words2 : words1;
      
      // より短い方が前方部分に含まれるかチェック
      const shorterText = shorter.join(' ');
      const longerText = longer.join(' ');
      
      if (longerText.startsWith(shorterText)) {
        return 0.95; // 継続追加パターン
      }
      
      // 短い方が長い方の50%以上を占める場合
      if (shorter.length >= longer.length * 0.5) {
        return 0.85;
      }
      
      return 0.7; // 冒頭1単語のみ一致
    }
    
    // 冒頭単語が一致しない場合は低い類似度
    return 0.3;
  }
  
  /**
   * 類似セグメントを検索
   */
  private findSimilarSegment(text: string): DisplaySegment | null {
    // アクティブなセグメントのみを対象
    const activeSegments = this.segments.filter(s => 
      s.status === 'active' || s.status === 'fading'
    );
    
    for (const segment of activeSegments) {
      const similarity = this.calculateSimilarity(text, segment.original);
      if (similarity >= this.similarityThreshold) {
        return segment;
      }
    }
    
    return null;
  }
  
  /**
   * 類似の翻訳を持つセグメントを検索
   */
  private findSegmentWithSimilarTranslation(text: string): DisplaySegment | null {
    // アクティブなセグメントで翻訳がある場合をチェック
    const segmentsWithTranslation = this.segments.filter(s => 
      (s.status === 'active' || s.status === 'fading') && s.translation
    );
    
    for (const segment of segmentsWithTranslation) {
      const similarity = this.calculateSimilarity(text, segment.translation);
      if (similarity >= 0.8) { // 翻訳は80%以上で類似とみなす
        return segment;
      }
    }
    
    return null;
  }
  
  /**
   * 翻訳に最適なセグメントを推定
   */
  private findBestMatchSegmentForTranslation(): DisplaySegment | null {
    // アクティブなセグメントの中で、翻訳がないものを優先
    const activeSegments = this.segments.filter(s => 
      (s.status === 'active' || s.status === 'fading')
    );
    
    // 翻訳がないセグメントがあればそれを返す
    const emptyTranslationSegments = activeSegments.filter(s => !s.translation);
    if (emptyTranslationSegments.length > 0) {
      return emptyTranslationSegments[0];
    }
    
    // 全てに翻訳がある場合は最新のものを返す
    if (activeSegments.length > 0) {
      return activeSegments[activeSegments.length - 1];
    }
    
    return null;
  }
}