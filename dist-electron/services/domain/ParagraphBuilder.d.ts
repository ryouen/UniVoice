/**
 * ParagraphBuilder - 履歴用のパラグラフ単位でテキストを構築
 *
 * 責任:
 * - 30-60秒のセグメントを1つのパラグラフにまとめる
 * - テキストのクリーン化（フィラー除去、整形）
 * - 高品質翻訳のトリガー
 */
export interface Paragraph {
    id: string;
    segments: Array<{
        id: string;
        text: string;
        timestamp: number;
    }>;
    startTime: number;
    endTime: number;
    rawText: string;
    cleanedText?: string;
    translation?: string;
    status: 'collecting' | 'processing' | 'completed';
}
export interface ParagraphBuilderOptions {
    minDurationMs?: number;
    maxDurationMs?: number;
    silenceThresholdMs?: number;
}
export declare class ParagraphBuilder {
    private onParagraphComplete;
    private options;
    private currentParagraph;
    private lastSegmentTime;
    private paragraphStartTime;
    constructor(onParagraphComplete: (paragraph: Paragraph) => void, options?: Required<ParagraphBuilderOptions>);
    /**
     * セグメントを追加
     */
    addSegment(segment: {
        id: string;
        text: string;
        timestamp: number;
        isFinal: boolean;
    }): void;
    /**
     * 強制的にパラグラフを完成させる
     */
    flush(): void;
    /**
     * 新しいパラグラフを開始
     */
    private startNewParagraph;
    /**
     * パラグラフを完成させる
     */
    private completeParagraph;
    /**
     * 自然な区切りかチェック（簡易版）
     */
    private isNaturalBreak;
    /**
     * テキストをクリーン化（静的メソッド）
     */
    static cleanText(rawText: string): string;
    /**
     * リソースのクリーンアップ
     */
    destroy(): void;
}
