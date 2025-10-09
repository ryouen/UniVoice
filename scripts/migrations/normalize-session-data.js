#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');
const os = require('os');

function normalizeLanguageCode(language) {
  if (!language) return undefined;
  return String(language).toLowerCase();
}

const CHARACTER_BASED_LANGUAGE_PREFIXES = ['ja', 'zh', 'ko'];
const CJK_CHAR_PATTERN = /[\u3040-\u30ff\u31f0-\u31ff\u3400-\u4dbf\u4e00-\u9fff\uF900-\uFAFF\uFF66-\uFF9D]/u;
const STRIP_PATTERN = /[。、，．？！,.!?\s]/g;

function isCharacterBasedLanguage(language) {
  const normalized = normalizeLanguageCode(language);
  if (!normalized) return false;
  return CHARACTER_BASED_LANGUAGE_PREFIXES.some(prefix => normalized === prefix || normalized.startsWith(`${prefix}-`));
}

function containsCJKCharacters(text) {
  return CJK_CHAR_PATTERN.test(text);
}

function countCharacters(text) {
  if (!text) return 0;
  return text.replace(STRIP_PATTERN, '').length;
}

function countWords(text, language) {
  if (!text) return 0;
  const normalizedLanguage = normalizeLanguageCode(language);
  if (isCharacterBasedLanguage(normalizedLanguage)) {
    return countCharacters(text);
  }
  if (!normalizedLanguage || normalizedLanguage === 'multi') {
    if (containsCJKCharacters(text)) {
      return countCharacters(text);
    }
  }
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function resolveSourceText(sentence) {
  if (!sentence) return '';
  return sentence.sourceText ?? sentence.original ?? '';
}

function resolveTargetText(sentence) {
  if (!sentence) return '';
  return sentence.targetText ?? sentence.translation ?? '';
}

function normalizeHistoryBlocks(blocks, sourceLanguage) {
  const normalizedBlocks = [];
  let totalWords = 0;
  let totalSegments = 0;

  for (const block of blocks) {
    if (!block || !Array.isArray(block.sentences)) continue;
    const normalizedSentences = block.sentences.map(sentence => {
      const sourceText = resolveSourceText(sentence);
      const targetText = resolveTargetText(sentence);
      totalWords += countWords(sourceText, sourceLanguage ?? 'multi');
      totalSegments += 1;
      return {
        id: sentence.id,
        sourceText,
        targetText,
        timestamp: sentence.timestamp,
        segmentIds: sentence.segmentIds,
        speaker: sentence.speaker,
        confidence: sentence.confidence
      };
    });

    normalizedBlocks.push({
      id: block.id,
      createdAt: block.createdAt,
      totalHeight: block.totalHeight,
      isParagraph: block.isParagraph,
      paragraphId: block.paragraphId,
      rawText: block.rawText,
      duration: block.duration,
      sentences: normalizedSentences
    });
  }

  return { blocks: normalizedBlocks, totalWords, totalSegments };
}

function normalizeSummary(summary) {
  if (!summary) return null;
  const sourceText = summary.sourceText ?? summary.english ?? '';
  const targetText = summary.targetText ?? summary.japanese ?? '';
  const timeRange = summary.timeRange;
  let normalizedTimeRange;
  if (!timeRange) {
    normalizedTimeRange = { start: 0, end: 0 };
  } else if (typeof timeRange === 'string') {
    const match = timeRange.match(/(\d+)/g);
    normalizedTimeRange = {
      start: match && match.length > 0 ? Number(match[0]) : 0,
      end: match && match.length > 1 ? Number(match[1]) : 0
    };
  } else {
    normalizedTimeRange = {
      start: Number(timeRange.start) || 0,
      end: Number(timeRange.end) || 0
    };
  }

  return {
    id: summary.id,
    sourceText,
    targetText,
    timestamp: summary.timestamp ?? Date.now(),
    wordCount: summary.wordCount ?? countWords(sourceText, 'multi'),
    threshold: summary.threshold,
    timeRange: normalizedTimeRange
  };
}

async function backupFile(filePath) {
  const backupPath = `${filePath}.bak`;
  await fs.copyFile(filePath, backupPath);
  return backupPath;
}

async function processSession(sessionPath, options) {
  const { dryRun, backup } = options;
  const files = await fs.readdir(sessionPath);
  const hasHistory = files.includes('history.json');
  if (!hasHistory) {
    return { updated: false };
  }

  const metadataPath = path.join(sessionPath, 'metadata.json');
  let metadata = null;
  try {
    const metadataContent = await fs.readFile(metadataPath, 'utf-8');
    metadata = JSON.parse(metadataContent);
  } catch (error) {
    console.warn(`[migrate] Failed to read metadata.json at ${sessionPath}: ${error.message}`);
  }

  const sourceLanguage = metadata?.sourceLanguage ?? 'multi';
  let historyUpdated = false;

  try {
    const historyPath = path.join(sessionPath, 'history.json');
    const historyContent = await fs.readFile(historyPath, 'utf-8');
    const parsedHistory = JSON.parse(historyContent);
    const rawBlocks = Array.isArray(parsedHistory?.blocks)
      ? parsedHistory.blocks
      : Array.isArray(parsedHistory)
        ? parsedHistory
        : [];
    const normalizedHistory = normalizeHistoryBlocks(rawBlocks, sourceLanguage);
    const historyData = {
      blocks: normalizedHistory.blocks,
      totalSegments: normalizedHistory.totalSegments,
      totalWords: normalizedHistory.totalWords
    };

    if (!dryRun) {
      if (backup) {
        await backupFile(historyPath);
      }
      await fs.writeFile(historyPath, JSON.stringify(historyData, null, 2), 'utf-8');
    }
    historyUpdated = true;

    if (metadata) {
      metadata.wordCount = historyData.totalWords;
    }
  } catch (error) {
    console.error(`[migrate] Failed to normalize history.json at ${sessionPath}: ${error.message}`);
  }

  let summariesUpdated = false;
  try {
    const summariesPath = path.join(sessionPath, 'summaries.json');
    const legacyPath = path.join(sessionPath, 'summary.json');
    let rawSummaries = [];

    if (files.includes('summaries.json')) {
      const summariesContent = await fs.readFile(summariesPath, 'utf-8');
      const parsedSummaries = JSON.parse(summariesContent);
      rawSummaries = Array.isArray(parsedSummaries) ? parsedSummaries : [];
    } else if (files.includes('summary.json')) {
      const legacyContent = await fs.readFile(legacyPath, 'utf-8');
      const parsedSummaries = JSON.parse(legacyContent);
      rawSummaries = Array.isArray(parsedSummaries?.summaries) ? parsedSummaries.summaries : [];
    }

    if (rawSummaries.length > 0 || files.includes('summary.json') || files.includes('summaries.json')) {
      const normalizedSummaries = rawSummaries.map(normalizeSummary).filter(Boolean);
      if (!dryRun) {
        if (backup && files.includes('summaries.json')) {
          await backupFile(summariesPath);
        }
        await fs.writeFile(summariesPath, JSON.stringify(normalizedSummaries, null, 2), 'utf-8');
        if (files.includes('summary.json')) {
          await fs.rename(legacyPath, `${legacyPath}.legacy`);
        }
      }
      summariesUpdated = true;
    }
  } catch (error) {
    console.error(`[migrate] Failed to normalize summaries at ${sessionPath}: ${error.message}`);
  }

  if (metadata) {
    try {
      if (!dryRun) {
        if (backup) {
          await backupFile(metadataPath);
        }
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
      }
    } catch (error) {
      console.error(`[migrate] Failed to update metadata wordCount at ${sessionPath}: ${error.message}`);
    }
  }

  return {
    updated: historyUpdated || summariesUpdated,
    historyUpdated,
    summariesUpdated,
    sessionPath
  };
}

async function walkSessions(root, options) {
  const results = [];
  const entries = await fs.readdir(root, { withFileTypes: true });
  const sessionPattern = /^(\d{6}|\d{8})_第(\d+)回$/;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const coursePath = path.join(root, entry.name);
    const courseEntries = await fs.readdir(coursePath, { withFileTypes: true });
    for (const sessionEntry of courseEntries) {
      if (!sessionEntry.isDirectory()) continue;
      if (!sessionPattern.test(sessionEntry.name)) continue;
      const sessionPath = path.join(coursePath, sessionEntry.name);
      const result = await processSession(sessionPath, options);
      if (result.updated) {
        results.push(result);
        console.log(`[migrate] Updated ${sessionPath}`);
      }
    }
  }

  return results;
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    backup: false
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--backup') {
      args.backup = true;
    } else if (arg === '--root' && argv[i + 1]) {
      args.root = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const defaultRoot = process.env.UNIVOICE_DATA_PATH || path.join(os.homedir(), 'UniVoice');
  const root = args.root ? path.resolve(args.root) : defaultRoot;

  try {
    await fs.access(root);
  } catch (error) {
    console.error(`[migrate] Data root not found: ${root}`);
    process.exit(1);
  }

  console.log(`[migrate] Starting normalization in ${root}${args.dryRun ? ' (dry-run)' : ''}`);
  const results = await walkSessions(root, args);
  console.log(`[migrate] Completed. Updated ${results.length} session(s).`);

  if (args.dryRun) {
    console.log('[migrate] Dry-run mode: no files were modified.');
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('[migrate] Unexpected error:', error);
    process.exit(1);
  });
}
