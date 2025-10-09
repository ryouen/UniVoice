import { FlexibleHistoryGrouper, HistoryBlock, HistorySentence } from '../../src/utils/FlexibleHistoryGrouper';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('FlexibleHistoryGrouper', () => {
  let grouper: FlexibleHistoryGrouper;
  let completedBlocks: HistoryBlock[] = [];

  beforeEach(() => {
    completedBlocks = [];
    grouper = new FlexibleHistoryGrouper((block) => {
      completedBlocks.push(block);
    });
  });

  describe('addSentence', () => {
    it('should add a sentence to the current block', () => {
      const sentence: HistorySentence = { id: 's1', sourceText: 'Hello', targetText: '', timestamp: Date.now() };
      grouper.addSentence(sentence);
      const currentBlock = grouper.getCurrentBlock();
      expect(currentBlock).toHaveLength(1);
      expect(currentBlock[0].id).toBe('s1');
    });

    it('should complete a block when max sentences are reached', async () => {
      grouper.addSentence({ id: 's1', sourceText: '1', targetText: '', timestamp: 1 });
      grouper.addSentence({ id: 's2', sourceText: '2', targetText: '', timestamp: 2 });
      grouper.addSentence({ id: 's3', sourceText: '3', targetText: '', timestamp: 3 });
      // Assuming MAX_SENTENCES_PER_BLOCK is 3, the block should complete automatically
      await delay(1); // Allow for async completion
      expect(completedBlocks).toHaveLength(1);
      expect(completedBlocks[0].sentences).toHaveLength(3);
      expect(grouper.getCurrentBlock()).toHaveLength(0);
    });
  });

  describe('updateSentenceTranslation', () => {
    it('should update a sentence in the current block', () => {
      grouper.addSentence({ id: 's1', sourceText: 'Hello', targetText: '', timestamp: Date.now() });
      grouper.updateSentenceTranslation('s1', 'こんにちは');
      const currentBlock = grouper.getCurrentBlock();
      expect(currentBlock[0].targetText).toBe('こんにちは');
    });

    it('should update a sentence in a completed block', async () => {
      // Add sentences and complete the block
      grouper.addSentence({ id: 's1', sourceText: 'First', targetText: '', timestamp: 1 });
      grouper.addSentence({ id: 's2', sourceText: 'Second', targetText: '古い翻訳', timestamp: 2 });
      grouper.forceCompleteCurrentBlock();
      await delay(1);

      expect(completedBlocks).toHaveLength(1);
      const completedBlock = completedBlocks[0];
      expect(completedBlock.sentences[1].targetText).toBe('古い翻訳');

      // Update the translation in the completed block
      grouper.updateSentenceTranslation('s2', '新しい翻訳');

      // The test assumes the original block object is mutated.
      expect(completedBlock.sentences[1].targetText).toBe('新しい翻訳');
    });
  });

  describe('forceCompleteCurrentBlock', () => {
    it('should complete the current block and call the callback', async () => {
      grouper.addSentence({ id: 's1', sourceText: 'Test', targetText: '', timestamp: Date.now() });
      grouper.forceCompleteCurrentBlock();
      await delay(1);

      expect(completedBlocks).toHaveLength(1);
      expect(completedBlocks[0].sentences[0].id).toBe('s1');
      expect(grouper.getCurrentBlock()).toHaveLength(0);
    });

    it('should not do anything if the current block is empty', async () => {
      grouper.forceCompleteCurrentBlock();
      await delay(1);
      expect(completedBlocks).toHaveLength(0);
    });
  });
});


