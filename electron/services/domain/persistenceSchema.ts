import { countWords } from '../../utils/textMetrics';

export interface RendererHistorySentence {
  id: string;
  sourceText?: string;
  targetText?: string;
  original?: string;
  translation?: string;
  timestamp: number;
  segmentIds?: string[];
  speaker?: string;
  confidence?: number;
}

export interface RendererHistoryBlock {
  id: string;
  sentences: RendererHistorySentence[];
  createdAt: number;
  totalHeight: number;
  isParagraph?: boolean;
  paragraphId?: string;
  rawText?: string;
  duration?: number;
}

export interface PersistedHistorySentence {
  id: string;
  sourceText: string;
  targetText: string;
  timestamp: number;
  segmentIds?: string[];
  speaker?: string;
  confidence?: number;
}

export interface PersistedHistoryBlock extends Omit<RendererHistoryBlock, 'sentences'> {
  sentences: PersistedHistorySentence[];
}

export interface RendererSummary {
  id: string;
  sourceText?: string;
  targetText?: string;
  english?: string;
  japanese?: string;
  wordCount?: number;
  timestamp: number;
  timeRange?: { start: number; end: number } | string;
  threshold?: number;
}

export interface PersistedSummary {
  id: string;
  sourceText: string;
  targetText: string;
  timestamp: number;
  wordCount: number;
  timeRange: { start: number; end: number };
  threshold?: number;
}

export interface NormalizeHistoryOptions {
  sourceLanguage?: string;
}

function resolveSourceText(sentence: RendererHistorySentence): string {
  return sentence.sourceText ?? sentence.original ?? '';
}

function resolveTargetText(sentence: RendererHistorySentence): string {
  return sentence.targetText ?? sentence.translation ?? '';
}

function normalizeTimeRange(value: RendererSummary['timeRange']): { start: number; end: number } {
  if (!value) {
    return { start: 0, end: 0 };
  }
  if (typeof value === 'string') {
    const match = value.match(/(\d+)/g);
    if (match && match.length >= 2) {
      return {
        start: Number(match[0]),
        end: Number(match[1])
      };
    }
    return { start: 0, end: 0 };
  }
  return value;
}

export function normalizeHistoryBlock(
  block: RendererHistoryBlock,
  options: NormalizeHistoryOptions = {}
): { block: PersistedHistoryBlock; wordCount: number; segmentCount: number } {
  const normalizedSentences: PersistedHistorySentence[] = block.sentences.map(sentence => ({
    id: sentence.id,
    sourceText: resolveSourceText(sentence),
    targetText: resolveTargetText(sentence),
    timestamp: sentence.timestamp,
    segmentIds: sentence.segmentIds,
    speaker: sentence.speaker,
    confidence: sentence.confidence
  }));

  const wordCount = normalizedSentences.reduce((sum, sentence) => {
    return sum + countWords(sentence.sourceText, options.sourceLanguage ?? 'multi');
  }, 0);

  return {
    block: {
      id: block.id,
      createdAt: block.createdAt,
      totalHeight: block.totalHeight,
      isParagraph: block.isParagraph,
      paragraphId: block.paragraphId,
      rawText: block.rawText,
      duration: block.duration,
      sentences: normalizedSentences
    },
    wordCount,
    segmentCount: normalizedSentences.length
  };
}

export function normalizeHistoryBlocks(
  blocks: RendererHistoryBlock[],
  options: NormalizeHistoryOptions = {}
): { blocks: PersistedHistoryBlock[]; totalWords: number; totalSegments: number } {
  const normalizedBlocks: PersistedHistoryBlock[] = [];
  let totalWords = 0;
  let totalSegments = 0;

  for (const block of blocks) {
    const { block: normalizedBlock, wordCount, segmentCount } = normalizeHistoryBlock(block, options);
    normalizedBlocks.push(normalizedBlock);
    totalWords += wordCount;
    totalSegments += segmentCount;
  }

  return { blocks: normalizedBlocks, totalWords, totalSegments };
}

export function normalizeSummary(summary: RendererSummary): PersistedSummary {
  const sourceText = summary.sourceText ?? summary.english ?? '';
  const targetText = summary.targetText ?? summary.japanese ?? '';
  const wordCount = summary.wordCount ?? countWords(sourceText, 'multi');

  return {
    id: summary.id,
    sourceText,
    targetText,
    timestamp: summary.timestamp,
    wordCount,
    threshold: summary.threshold,
    timeRange: normalizeTimeRange(summary.timeRange)
  };
}

export function cloneHistoryBlocks(blocks: PersistedHistoryBlock[]): PersistedHistoryBlock[] {
  return blocks.map(block => ({
    ...block,
    sentences: block.sentences.map(sentence => ({ ...sentence }))
  }));
}

export function calculateHistoryTotals(
  blocks: PersistedHistoryBlock[],
  options: NormalizeHistoryOptions = {}
): { totalWords: number; totalSegments: number } {
  let totalWords = 0;
  let totalSegments = 0;

  for (const block of blocks) {
    for (const sentence of block.sentences) {
      totalWords += countWords(sentence.sourceText, options.sourceLanguage ?? 'multi');
      totalSegments += 1;
    }
  }

  return { totalWords, totalSegments };
}
