import { FlexibleHistoryGrouper, HistoryBlock } from '../../src/utils/FlexibleHistoryGrouper';

describe('FlexibleHistoryGrouper Phase 1 修正テスト', () => {
  let grouper: FlexibleHistoryGrouper;
  let completedBlocks: HistoryBlock[] = [];

  beforeEach(() => {
    completedBlocks = [];
    grouper = new FlexibleHistoryGrouper((block) => {
      completedBlocks.push(block);
    });
  });

  describe('updateSentenceTranslation メソッド', () => {
    it('現在のブロック内の文を更新できる', () => {
      // 文を追加
      grouper.addSentence({
        id: 'sentence_1',
        original: 'Hello world.',
        translation: '', // Phase 1: 空文字列で初期化
        timestamp: Date.now()
      });

      // 翻訳を更新
      grouper.updateSentenceTranslation('sentence_1', 'こんにちは世界。');

      // 現在のブロックを確認
      const currentBlock = grouper.getCurrentBlock();
      expect(currentBlock[0].translation).toBe('こんにちは世界。');
    });

    it('完成済みブロック内の文を更新できる', () => {
      // 3文追加してブロックを完成させる
      const now = Date.now();
      grouper.addSentence({
        id: 'sentence_1',
        original: 'First sentence.',
        translation: '',
        timestamp: now
      });
      grouper.addSentence({
        id: 'sentence_2', 
        original: 'Second sentence.',
        translation: '',
        timestamp: now + 100
      });
      grouper.addSentence({
        id: 'sentence_3',
        original: 'Third sentence.',
        translation: '',
        timestamp: now + 200
      });

      // ブロックを強制完成
      grouper.forceCompleteCurrentBlock();
      expect(completedBlocks.length).toBe(1);

      // リセットして新しいコールバックを設定
      const updatedBlocks: HistoryBlock[] = [];
      grouper = new FlexibleHistoryGrouper((block) => {
        updatedBlocks.push(block);
      });
      
      // 完成済みブロックを復元
      const originalBlock = completedBlocks[0];
      grouper['completedBlocks'] = [originalBlock];

      // 完成済みブロック内の文を更新
      grouper.updateSentenceTranslation('sentence_2', '二番目の文。');

      // onBlockCompleteが呼ばれることを確認
      expect(updatedBlocks.length).toBe(1);
      expect(updatedBlocks[0].sentences[1].translation).toBe('二番目の文。');
    });

    it('存在しないIDの場合は何も起こらない', () => {
      grouper.addSentence({
        id: 'sentence_1',
        original: 'Hello.',
        translation: '',
        timestamp: Date.now()
      });

      // 存在しないIDで更新を試みる
      grouper.updateSentenceTranslation('non_existent', '翻訳');

      // 何も変わらないことを確認
      const currentBlock = grouper.getCurrentBlock();
      expect(currentBlock[0].translation).toBe('');
    });

    it('高さが再計算される', () => {
      // 文を追加してブロックを完成
      const now = Date.now();
      for (let i = 1; i <= 3; i++) {
        grouper.addSentence({
          id: `sentence_${i}`,
          original: `Sentence ${i}.`,
          translation: '',
          timestamp: now + i * 100
        });
      }
      grouper.forceCompleteCurrentBlock();

      const originalHeight = completedBlocks[0].totalHeight;

      // 新しいgrouperで更新
      const updatedBlocks: HistoryBlock[] = [];
      grouper = new FlexibleHistoryGrouper((block) => {
        updatedBlocks.push(block);
      });
      grouper['completedBlocks'] = [completedBlocks[0]];

      // 長い翻訳で更新
      grouper.updateSentenceTranslation('sentence_1', 
        'これは非常に長い翻訳文で、複数行にわたって表示される可能性があります。高さの再計算が正しく行われることを確認します。');

      // 高さが更新されることを確認
      expect(updatedBlocks[0].totalHeight).toBeGreaterThan(originalHeight);
    });
  });

  describe('Phase 1 統合シナリオ', () => {
    it('空文字列で初期化し、後から高品質翻訳で更新する', () => {
      // 実際の使用シナリオをシミュレート
      const sentences = [
        { id: 'combined_1', original: 'Hello world.', timestamp: 1000 },
        { id: 'combined_2', original: 'How are you?', timestamp: 2000 },
        { id: 'combined_3', original: 'Nice to meet you.', timestamp: 3000 }
      ];

      // Step 1: 空文字列で初期化（Phase 1の修正）
      sentences.forEach(s => {
        grouper.addSentence({
          ...s,
          translation: '' // 「翻訳中...」ではなく空文字列
        });
      });

      // Step 2: 高品質翻訳が到着
      setTimeout(() => {
        grouper.updateSentenceTranslation('combined_1', 'こんにちは世界。');
        grouper.updateSentenceTranslation('combined_2', 'お元気ですか？');
        grouper.updateSentenceTranslation('combined_3', 'はじめまして。');
      }, 100);

      // 翻訳が更新されていることを確認
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const currentBlock = grouper.getCurrentBlock();
          expect(currentBlock[0].translation).toBe('こんにちは世界。');
          expect(currentBlock[1].translation).toBe('お元気ですか？');
          expect(currentBlock[2].translation).toBe('はじめまして。');
          resolve();
        }, 200);
      });
    });
  });
});