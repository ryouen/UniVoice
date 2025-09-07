/**
 * FlexibleHistoryGrouper - 3〜5文の柔軟な履歴グループ化
 * 
 * 設計原則:
 * 1. 3〜5文を1ブロックとして管理
 * 2. 文の区切りは句読点で判定
 * 3. 原文と翻訳のペアを保持
 * 4. ブロック内でも左右の高さを揃える
 */

export interface HistorySentence {
  id: string;
  original: string;
  translation: string;
  timestamp: number;
}

export interface HistoryBlock {
  id: string;
  sentences: HistorySentence[];
  createdAt: number;
  totalHeight: number; // ブロック全体の高さ
  // パラグラフモード用の追加フィールド
  isParagraph?: boolean;
  paragraphId?: string;
  rawText?: string;
  duration?: number;
}

export class FlexibleHistoryGrouper {
  private currentBlock: HistorySentence[] = [];
  private completedBlocks: HistoryBlock[] = [];
  private minSentencesPerBlock = 3;
  private maxSentencesPerBlock = 5;
  
  constructor(
    private onBlockComplete: (block: HistoryBlock) => void
  ) {}
  
  /**
   * 新しい文を追加
   */
  addSentence(sentence: HistorySentence): void {
    this.currentBlock.push(sentence);
    
    // 文の数をチェック
    const sentenceCount = this.countSentences();
    
    // 最大文数に達したら強制的にブロック化
    if (sentenceCount >= this.maxSentencesPerBlock) {
      this.completeCurrentBlock();
      return;
    }
    
    // 最小文数に達していて、自然な区切りがあればブロック化
    if (sentenceCount >= this.minSentencesPerBlock) {
      if (this.isNaturalBreakPoint()) {
        this.completeCurrentBlock();
      }
    }
  }
  
  /**
   * 現在のブロックの文数をカウント
   */
  private countSentences(): number {
    let count = 0;
    
    for (const item of this.currentBlock) {
      // 日本語の句点（。）と英語のピリオド（.）をカウント
      const japaneseSentences = (item.translation.match(/。/g) || []).length;
      const englishSentences = (item.original.match(/\./g) || []).length;
      
      // より多い方を採用（翻訳で文が分割される場合があるため）
      count += Math.max(japaneseSentences || 1, englishSentences || 1);
    }
    
    return count;
  }
  
  /**
   * 自然な区切りかどうかを判定
   */
  private isNaturalBreakPoint(): boolean {
    if (this.currentBlock.length === 0) return false;
    
    const lastItem = this.currentBlock[this.currentBlock.length - 1];
    
    // 段落の終わりを示すパターン
    const paragraphEndPatterns = [
      /\.\s*$/,           // ピリオドで終わる
      /。\s*$/,           // 句点で終わる
      /\?\s*$/,           // 疑問符で終わる
      /！\s*$/,           // 感嘆符で終わる
      /\!\s*$/,           // 感嘆符（半角）
    ];
    
    // 原文か翻訳のいずれかが段落終了パターンに一致
    const isEndOfParagraph = paragraphEndPatterns.some(pattern => 
      pattern.test(lastItem.original) || pattern.test(lastItem.translation)
    );
    
    // 時間的な区切り（前の文から3秒以上経過）
    let hasTimePause = false;
    if (this.currentBlock.length > 1) {
      const previousItem = this.currentBlock[this.currentBlock.length - 2];
      hasTimePause = lastItem.timestamp - previousItem.timestamp > 3000;
    }
    
    return isEndOfParagraph || hasTimePause;
  }
  
  /**
   * 現在のブロックを完成させる
   */
  private completeCurrentBlock(): void {
    if (this.currentBlock.length === 0) return;
    
    const now = Date.now();
    const block: HistoryBlock = {
      id: `block_${now}`,
      sentences: [...this.currentBlock],
      createdAt: now,
      totalHeight: this.calculateBlockHeight(this.currentBlock)
    };
    
    this.completedBlocks.push(block);
    this.onBlockComplete(block);
    
    // 現在のブロックをクリア
    this.currentBlock = [];
  }
  
  /**
   * ブロック全体の高さを計算
   */
  private calculateBlockHeight(sentences: HistorySentence[]): number {
    let totalHeight = 0;
    const lineHeight = 24;
    const sentenceSpacing = 8;
    const blockPadding = 24;
    
    for (const sentence of sentences) {
      // 原文と翻訳の両方の行数を計算
      const originalLines = Math.ceil(sentence.original.length / 40);
      const translationLines = Math.ceil(sentence.translation.length / 40);
      
      // より高い方を採用（左右で高さを揃えるため）
      const maxLines = Math.max(originalLines, translationLines);
      totalHeight += maxLines * lineHeight + sentenceSpacing;
    }
    
    return totalHeight + blockPadding;
  }
  
  /**
   * 強制的に現在のブロックを完成させる
   */
  forceCompleteCurrentBlock(): void {
    if (this.currentBlock.length > 0) {
      this.completeCurrentBlock();
    }
  }
  
  /**
   * 既存の文の翻訳を更新
   * Phase 1修正: 高品質翻訳が到着した時に履歴を更新するため
   */
  updateSentenceTranslation(sentenceId: string, translation: string): void {
    // 現在のブロック内の文を更新
    const currentIndex = this.currentBlock.findIndex(s => s.id === sentenceId);
    if (currentIndex !== -1) {
      this.currentBlock[currentIndex] = {
        ...this.currentBlock[currentIndex],
        translation
      };
      return;
    }
    
    // 完成済みブロック内の文を更新
    for (let i = 0; i < this.completedBlocks.length; i++) {
      const block = this.completedBlocks[i];
      const sentenceIndex = block.sentences.findIndex(s => s.id === sentenceId);
      if (sentenceIndex !== -1) {
        // 新しいセンテンス配列を作成（イミュータブル）
        const updatedSentences = [...block.sentences];
        updatedSentences[sentenceIndex] = {
          ...updatedSentences[sentenceIndex],
          translation
        };
        
        // ブロック全体を更新
        this.completedBlocks[i] = {
          ...block,
          sentences: updatedSentences,
          totalHeight: this.calculateBlockHeight(updatedSentences)
        };
        
        // 更新を通知（ただし、無限ループを防ぐためのフラグが必要かもしれない）
        // this.onBlockComplete(this.completedBlocks[i]);
        // 注意: 現在のアーキテクチャでは、UIは別途更新される
        return;
      }
    }
  }
  
  /**
   * 完成したブロックを取得
   */
  getCompletedBlocks(): HistoryBlock[] {
    return [...this.completedBlocks];
  }
  
  /**
   * 現在作成中のブロックを取得
   */
  getCurrentBlock(): HistorySentence[] {
    return [...this.currentBlock];
  }
  
  /**
   * 全てリセット
   */
  reset(): void {
    this.currentBlock = [];
    this.completedBlocks = [];
  }
  
  /**
   * デバッグ情報
   */
  getDebugInfo(): {
    currentBlockSize: number;
    currentSentenceCount: number;
    completedBlocks: number;
  } {
    return {
      currentBlockSize: this.currentBlock.length,
      currentSentenceCount: this.countSentences(),
      completedBlocks: this.completedBlocks.length
    };
  }
  
  /**
   * パラグラフを追加（Phase 2-ParagraphBuilder対応）
   * パラグラフは既に適切な単位になっているため、そのまま1ブロックとして追加
   */
  addParagraph(paragraph: {
    id: string;
    originalText: string;
    translation: string;
    timestamp: number;
  }): void {
    // 現在のブロックがあれば先に完成させる
    if (this.currentBlock.length > 0) {
      this.completeCurrentBlock();
    }
    
    // パラグラフを1つの文として扱い、即座にブロック化
    const paragraphSentence: HistorySentence = {
      id: paragraph.id,
      original: paragraph.originalText,
      translation: paragraph.translation,
      timestamp: paragraph.timestamp
    };
    
    // 1つのパラグラフで1ブロックを構成
    const block: HistoryBlock = {
      id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sentences: [paragraphSentence],
      createdAt: Date.now(),
      totalHeight: this.calculateBlockHeight([paragraphSentence])
    };
    
    this.completedBlocks.push(block);
    this.onBlockComplete(block);
  }
  
  /**
   * パラグラフの翻訳を更新（Phase 2-ParagraphBuilder対応）
   */
  updateParagraphTranslation(paragraphId: string, translation: string): void {
    // 完成済みブロック内のパラグラフを探して更新
    for (let i = 0; i < this.completedBlocks.length; i++) {
      const block = this.completedBlocks[i];
      // パラグラフブロックは通常1文のみ
      if (block.sentences.length === 1 && block.sentences[0].id === paragraphId) {
        const updatedSentence = {
          ...block.sentences[0],
          translation
        };
        
        this.completedBlocks[i] = {
          ...block,
          sentences: [updatedSentence],
          totalHeight: this.calculateBlockHeight([updatedSentence])
        };
        
        // UIの更新は別途行われる
        return;
      }
    }
  }
}