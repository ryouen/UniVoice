import { ParagraphBuilder, Paragraph } from '../../electron/services/domain/ParagraphBuilder';

describe('ParagraphBuilder', () => {
  let paragraphBuilder: ParagraphBuilder;
  let completedParagraphs: Paragraph[] = [];
  
  beforeEach(() => {
    completedParagraphs = [];
    paragraphBuilder = new ParagraphBuilder(
      (paragraph) => completedParagraphs.push(paragraph),
      {
        minDurationMs: 5000,    // テスト用に短縮
        maxDurationMs: 10000,   // テスト用に短縮
        silenceThresholdMs: 1000 // テスト用に短縮
      }
    );
  });
  
  afterEach(() => {
    paragraphBuilder['destroy']?.();
  });
  
  describe('基本的なパラグラフ形成', () => {
    it('最小期間後に自然な区切りでパラグラフを完成させる', () => {
      const segments = [
        { id: 'seg1', text: 'This is the first sentence.', timestamp: 1000, isFinal: true },
        { id: 'seg2', text: 'This is the second sentence.', timestamp: 2000, isFinal: true },
        { id: 'seg3', text: 'This is the third sentence.', timestamp: 3000, isFinal: true },
      ];
      
      // 最初の3セグメントを追加（まだ最小期間に達していない）
      jest.useFakeTimers();
      const baseTime = new Date('2025-09-02T12:00:00Z').getTime();
      jest.setSystemTime(baseTime);
      
      segments.forEach((s, index) => {
        jest.setSystemTime(baseTime + index * 1000); // 各セグメントで時間を進める
        paragraphBuilder.addSegment(s);
      });
      expect(completedParagraphs).toHaveLength(0);
      
      // 時間を進めて最小期間を超える（6秒後）
      jest.setSystemTime(baseTime + 6000);
      
      // 自然な区切りとなる4番目のセグメントを追加
      const transitionSegment = {
        id: 'seg4',
        text: 'Now, let me explain the next topic.',
        timestamp: baseTime + 7000,
        isFinal: true
      };
      paragraphBuilder.addSegment(transitionSegment);
      
      expect(completedParagraphs).toHaveLength(1);
      expect(completedParagraphs[0].segments).toHaveLength(3);
      expect(completedParagraphs[0].rawText).toContain('first sentence');
      jest.useRealTimers();
    });
    
    it('最大期間に達したら強制的にパラグラフを完成させる', () => {
      jest.useFakeTimers();
      const baseTime = new Date('2025-09-02T12:00:00Z').getTime();
      jest.setSystemTime(baseTime);
      
      // 最初のセグメントを追加
      paragraphBuilder.addSegment({
        id: 'seg0',
        text: 'First segment.',
        timestamp: baseTime,
        isFinal: true
      });
      
      // 時間を進めながらセグメントを追加
      for (let i = 1; i < 20; i++) {
        jest.setSystemTime(baseTime + i * 1000); // 1秒ずつ進める
        paragraphBuilder.addSegment({
          id: `seg${i}`,
          text: `Sentence number ${i}.`,
          timestamp: baseTime + i * 1000,
          isFinal: true
        });
        
        // 10秒を超えたらパラグラフが完成しているはず
        if (i >= 10 && completedParagraphs.length > 0) {
          break;
        }
      }
      
      // 最大期間（10秒）を超えているので、パラグラフが完成しているはず
      expect(completedParagraphs.length).toBeGreaterThanOrEqual(1);
      jest.useRealTimers();
    });
  });
  
  describe('無音検出', () => {
    it('無音を検出してパラグラフを区切る', () => {
      const segments = [
        { id: 'seg1', text: 'First part.', timestamp: 1000, isFinal: true },
        { id: 'seg2', text: 'Still first part.', timestamp: 1500, isFinal: true },
        // 2秒の無音
        { id: 'seg3', text: 'Second part after silence.', timestamp: 3600, isFinal: true },
      ];
      
      paragraphBuilder.addSegment(segments[0]);
      paragraphBuilder.addSegment(segments[1]);
      
      expect(completedParagraphs).toHaveLength(0);
      
      // 無音後のセグメント
      paragraphBuilder.addSegment(segments[2]);
      
      // 無音が検出されて最初のパラグラフが完成
      expect(completedParagraphs).toHaveLength(1);
      expect(completedParagraphs[0].segments).toHaveLength(2);
    });
  });
  
  describe('テキストクリーン化', () => {
    it('フィラーを除去する', () => {
      const rawText = 'Um, this is, you know, a test sentence with, uh, fillers.';
      const cleaned = ParagraphBuilder.cleanText(rawText);
      
      expect(cleaned).not.toContain('Um');
      expect(cleaned).not.toContain('you know');
      expect(cleaned).not.toContain('uh');
      expect(cleaned).toContain('this is');
      expect(cleaned).toContain('a test sentence');
    });
    
    it('重複を除去する', () => {
      const rawText = 'The the quick brown fox fox jumps.';
      const cleaned = ParagraphBuilder.cleanText(rawText);
      
      expect(cleaned).toBe('The quick brown fox jumps.');
    });
    
    it('文頭を大文字にする', () => {
      const rawText = 'hello world. this is a test.';
      const cleaned = ParagraphBuilder.cleanText(rawText);
      
      expect(cleaned).toBe('Hello world. This is a test.');
    });
  });
  
  describe('エッジケース', () => {
    it('空のセグメントを無視する', () => {
      paragraphBuilder.addSegment({
        id: 'empty',
        text: '',
        timestamp: 1000,
        isFinal: true
      });
      
      expect(paragraphBuilder['currentParagraph']).toBeNull();
    });
    
    it('finalでないセグメントを無視する', () => {
      paragraphBuilder.addSegment({
        id: 'interim',
        text: 'Interim text',
        timestamp: 1000,
        isFinal: false
      });
      
      expect(paragraphBuilder['currentParagraph']).toBeNull();
    });
    
    it('flushで残りのセグメントを出力する', () => {
      const segments = [
        { id: 'seg1', text: 'Unfinished paragraph.', timestamp: 1000, isFinal: true },
        { id: 'seg2', text: 'Still not complete.', timestamp: 2000, isFinal: true },
      ];
      
      segments.forEach(s => paragraphBuilder.addSegment(s));
      expect(completedParagraphs).toHaveLength(0);
      
      paragraphBuilder.flush();
      
      expect(completedParagraphs).toHaveLength(1);
      expect(completedParagraphs[0].segments).toHaveLength(2);
    });
  });
  
  describe('自然な区切りの検出', () => {
    const transitionPhrases = [
      'So, let me explain',
      'Now, the next topic',
      'Next, we will discuss',
      'Okay, moving on',
      'Alright, let\'s talk about',
      'Well, another point',
      'Let me show you',
      'I want to mention',
      'Moving on to',
      'In conclusion',
      'To summarize'
    ];
    
    transitionPhrases.forEach(phrase => {
      it(`"${phrase}"を自然な区切りとして検出する`, () => {
        jest.useFakeTimers();
        const baseTime = new Date('2025-09-02T12:00:00Z').getTime();
        jest.setSystemTime(baseTime);
        
        // まず通常のセグメントを追加
        paragraphBuilder.addSegment({
          id: 'seg1',
          text: 'Some initial content.',
          timestamp: baseTime,
          isFinal: true
        });
        
        jest.setSystemTime(baseTime + 6000); // 最小期間を超える
        
        // 転換フレーズを含むセグメントを追加
        paragraphBuilder.addSegment({
          id: 'transition',
          text: phrase + ' something new.',
          timestamp: baseTime + 7000,
          isFinal: true
        });
        
        // パラグラフが完成しているはず
        expect(completedParagraphs).toHaveLength(1);
        jest.useRealTimers();
      });
    });
  });
});