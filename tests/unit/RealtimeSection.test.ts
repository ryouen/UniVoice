/**
 * RealtimeSection単体テスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RealtimeSection } from '../../src/presentation/components/UniVoice/sections/RealtimeSection';

describe('RealtimeSection', () => {
  describe('基本レンダリング', () => {
    it('セクションが正しい高さでレンダリングされる', () => {
      const { container } = render(<RealtimeSection />);
      
      const section = container.firstChild as HTMLElement;
      expect(section).toHaveStyle({ height: '44vh' });
    });
    
    it('2つのカラムが表示される', () => {
      const { container } = render(<RealtimeSection />);
      
      const columns = container.querySelectorAll('div[style*="flex: 1"]');
      expect(columns).toHaveLength(2);
    });
    
    it('IDが正しく設定される', () => {
      render(<RealtimeSection />);
      
      expect(document.getElementById('currentOriginal')).toBeInTheDocument();
      expect(document.getElementById('currentTranslation')).toBeInTheDocument();
    });
  });
  
  describe('直接コンテンツ表示', () => {
    it('currentOriginalが表示される', () => {
      render(
        <RealtimeSection 
          currentOriginal="This is a test"
          currentTranslation="これはテストです"
        />
      );
      
      expect(screen.getByText('This is a test')).toBeInTheDocument();
      expect(screen.getByText('これはテストです')).toBeInTheDocument();
    });
    
    it('空のコンテンツでもエラーにならない', () => {
      const { container } = render(
        <RealtimeSection 
          currentOriginal=""
          currentTranslation=""
        />
      );
      
      expect(container.firstChild).toBeInTheDocument();
    });
  });
  
  describe('3段階表示', () => {
    it('displayContentが正しく表示される', () => {
      const displayContent = {
        original: {
          oldest: 'oldest text',
          older: 'older text',
          recent: 'recent text'
        },
        translation: {
          oldest: '古いテキスト',
          older: '少し古いテキスト',
          recent: '最新テキスト'
        }
      };
      
      render(<RealtimeSection displayContent={displayContent} />);
      
      // 原文
      expect(screen.getByText('oldest text')).toBeInTheDocument();
      expect(screen.getByText('older text')).toBeInTheDocument();
      expect(screen.getByText('recent text')).toBeInTheDocument();
      
      // 翻訳
      expect(screen.getByText('古いテキスト')).toBeInTheDocument();
      expect(screen.getByText('少し古いテキスト')).toBeInTheDocument();
      expect(screen.getByText('最新テキスト')).toBeInTheDocument();
    });
    
    it('部分的なdisplayContentでも動作する', () => {
      const displayContent = {
        original: {
          recent: 'only recent'
        },
        translation: {
          recent: '最新のみ'
        }
      };
      
      render(<RealtimeSection displayContent={displayContent} />);
      
      expect(screen.getByText('only recent')).toBeInTheDocument();
      expect(screen.getByText('最新のみ')).toBeInTheDocument();
    });
  });
  
  describe('音声レベル表示', () => {
    it('volumeLevelが0の場合は表示されない', () => {
      const { container } = render(<RealtimeSection volumeLevel={0} />);
      
      const volumeIndicator = container.querySelector('[style*="bottom: 10px"]');
      expect(volumeIndicator).not.toBeInTheDocument();
    });
    
    it('volumeLevelが設定されると表示される', () => {
      const { container } = render(
        <RealtimeSection volumeLevel={0.5} isRunning={true} />
      );
      
      const volumeIndicator = container.querySelector('[style*="bottom: 10px"]');
      expect(volumeIndicator).toBeInTheDocument();
      
      const volumeBar = volumeIndicator?.querySelector('div');
      expect(volumeBar).toHaveStyle({ width: '50%' });
    });
    
    it('録音中は緑色、停止中は灰色で表示される', () => {
      const { container: runningContainer } = render(
        <RealtimeSection volumeLevel={0.5} isRunning={true} />
      );
      
      const runningBar = runningContainer.querySelector('[style*="background: #4CAF50"]');
      expect(runningBar).toBeInTheDocument();
      
      const { container: stoppedContainer } = render(
        <RealtimeSection volumeLevel={0.5} isRunning={false} />
      );
      
      const stoppedBar = stoppedContainer.querySelector('[style*="background: #999"]');
      expect(stoppedBar).toBeInTheDocument();
    });
  });
  
  describe('優先順位', () => {
    it('directContentがdisplayContentより優先される', () => {
      const displayContent = {
        original: { recent: 'display content' },
        translation: { recent: '表示コンテンツ' }
      };
      
      render(
        <RealtimeSection 
          currentOriginal="direct content"
          currentTranslation="直接コンテンツ"
          displayContent={displayContent}
        />
      );
      
      expect(screen.getByText('direct content')).toBeInTheDocument();
      expect(screen.getByText('直接コンテンツ')).toBeInTheDocument();
      expect(screen.queryByText('display content')).not.toBeInTheDocument();
      expect(screen.queryByText('表示コンテンツ')).not.toBeInTheDocument();
    });
  });
  
  describe('デバッグモード', () => {
    it('デバッグモードでコンソールログが出力される', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(
        <RealtimeSection 
          currentOriginal="test"
          debug={true}
        />
      );
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ThreeLineDisplay] Rendering currentOriginal:'),
        expect.any(Object)
      );
      
      consoleSpy.mockRestore();
    });
  });
});