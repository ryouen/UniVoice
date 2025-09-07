/**
 * SetupSection単体テスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SetupSection } from '../../src/presentation/components/UniVoice/sections/SetupSection';

describe('SetupSection', () => {
  const mockOnStartSession = jest.fn();
  
  beforeEach(() => {
    mockOnStartSession.mockClear();
    // LocalStorageのモック
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
  });
  
  describe('初期表示', () => {
    it('タイトルが表示される', () => {
      render(<SetupSection onStartSession={mockOnStartSession} />);
      
      expect(screen.getByText('UniVoice')).toBeInTheDocument();
    });
    
    it('サブタイトルが表示される', () => {
      render(<SetupSection onStartSession={mockOnStartSession} />);
      
      expect(screen.getByText('言語の壁を超えて、あなたの能力を発揮しよう')).toBeInTheDocument();
    });
    
    it('セッション開始ボタンが表示される', () => {
      render(<SetupSection onStartSession={mockOnStartSession} />);
      
      expect(screen.getByText('セッション開始')).toBeInTheDocument();
    });
  });
  
  describe('授業選択', () => {
    it('デフォルトの授業リストが表示される', () => {
      (Storage.prototype.getItem as jest.Mock).mockReturnValue(null);
      
      render(<SetupSection onStartSession={mockOnStartSession} />);
      
      expect(screen.getByText(/機械学習基礎/)).toBeInTheDocument();
      expect(screen.getByText(/データ構造とアルゴリズム/)).toBeInTheDocument();
    });
    
    it('保存された授業リストが表示される', () => {
      const savedClasses = ['保存された授業1', '保存された授業2'];
      (Storage.prototype.getItem as jest.Mock).mockReturnValue(JSON.stringify(savedClasses));
      
      render(<SetupSection onStartSession={mockOnStartSession} />);
      
      expect(screen.getByText('保存された授業1')).toBeInTheDocument();
      expect(screen.getByText('保存された授業2')).toBeInTheDocument();
    });
    
    it('授業をクリックすると選択される', () => {
      render(<SetupSection onStartSession={mockOnStartSession} />);
      
      const classButton = screen.getByText(/機械学習基礎/);
      fireEvent.click(classButton);
      
      // スタイルの変更を確認（選択状態）
      expect(classButton).toHaveStyle({ color: 'white' });
    });
  });
  
  describe('新規授業名入力', () => {
    it('入力フィールドが表示される', () => {
      render(<SetupSection onStartSession={mockOnStartSession} />);
      
      expect(screen.getByPlaceholderText('例: プログラミング基礎')).toBeInTheDocument();
    });
    
    it('入力フィールドにフォーカスすると選択がクリアされる', () => {
      render(<SetupSection onStartSession={mockOnStartSession} />);
      
      // まず授業を選択
      const classButton = screen.getByText(/機械学習基礎/);
      fireEvent.click(classButton);
      
      // 入力フィールドにフォーカス
      const input = screen.getByPlaceholderText('例: プログラミング基礎');
      fireEvent.focus(input);
      
      // 選択がクリアされる（スタイルが戻る）
      expect(classButton).not.toHaveStyle({ color: 'white' });
    });
  });
  
  describe('セッション開始', () => {
    it('選択された授業名でセッションが開始される', () => {
      render(<SetupSection onStartSession={mockOnStartSession} />);
      
      const classButton = screen.getByText(/機械学習基礎/);
      fireEvent.click(classButton);
      
      const startButton = screen.getByText('セッション開始');
      fireEvent.click(startButton);
      
      expect(mockOnStartSession).toHaveBeenCalledWith(expect.stringContaining('機械学習基礎'));
    });
    
    it('新規入力された授業名でセッションが開始される', () => {
      render(<SetupSection onStartSession={mockOnStartSession} />);
      
      const input = screen.getByPlaceholderText('例: プログラミング基礎');
      fireEvent.change(input, { target: { value: 'テスト授業' } });
      
      const startButton = screen.getByText('セッション開始');
      fireEvent.click(startButton);
      
      expect(mockOnStartSession).toHaveBeenCalledWith(expect.stringContaining('テスト授業'));
    });
    
    it('何も選択されていない場合はデフォルト名でセッションが開始される', () => {
      render(<SetupSection onStartSession={mockOnStartSession} />);
      
      const startButton = screen.getByText('セッション開始');
      fireEvent.click(startButton);
      
      expect(mockOnStartSession).toHaveBeenCalledWith(expect.stringMatching(/^\d{6}_授業$/));
    });
  });
  
  describe('キーボードショートカット', () => {
    it('スペースキーでセッションが開始される', () => {
      render(<SetupSection onStartSession={mockOnStartSession} />);
      
      fireEvent.keyDown(document, { code: 'Space' });
      
      expect(mockOnStartSession).toHaveBeenCalled();
    });
  });
  
  describe('LocalStorage連携', () => {
    it('新しい授業が追加されるとLocalStorageに保存される', () => {
      render(<SetupSection onStartSession={mockOnStartSession} />);
      
      const input = screen.getByPlaceholderText('例: プログラミング基礎');
      fireEvent.change(input, { target: { value: '新しい授業' } });
      
      const startButton = screen.getByText('セッション開始');
      fireEvent.click(startButton);
      
      expect(Storage.prototype.setItem).toHaveBeenCalledWith(
        'recentClasses',
        expect.stringContaining('新しい授業')
      );
    });
  });
});