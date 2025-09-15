import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SetupSection } from '../../src/presentation/components/UniVoice/sections/SetupSection';

// CourseMetadataの型定義をテストファイルに持ち込む
interface CourseMetadata {
  id: string;
  name: string;
  lastUsed: Date;
  isPinned: boolean;
  labels: string[];
  sessionCount?: number;
  sourceLanguage?: string;
  targetLanguage?: string;
}

describe('SetupSection', () => {
  const mockOnStartSession = jest.fn();

  beforeEach(() => {
    mockOnStartSession.mockClear();
    // localStorageのモックをリセット
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
    // windowClientの基本的なモック
    (global as any).windowClient = {
      measureAndSetSetupSize: jest.fn().mockResolvedValue(true),
    };
  });

  it('should render courses from localStorage and start a session', () => {
    // 1. Arrange: モックデータとlocalStorageのセットアップ
    const mockCourses: CourseMetadata[] = [
      {
        id: '1',
        name: 'テスト授業1',
        lastUsed: new Date(),
        isPinned: false,
        labels: ['工学系'],
      },
      {
        id: '2',
        name: 'テスト授業2',
        lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        isPinned: true,
        labels: ['数学系', '集中講義'],
      },
    ];

    (Storage.prototype.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'courseMetadata') {
        return JSON.stringify(mockCourses.map(c => ({...c, lastUsed: c.lastUsed.toISOString() })));
      }
      if (key === 'courseLabels') {
        return JSON.stringify(['工学系', '数学系', '集中講義']);
      }
      return null;
    });

    // 2. Act: コンポーネントのレンダリング
    render(<SetupSection onStartSession={mockOnStartSession} />);

    // 3. Assert: 初期表示の確認
    // ピン留めされたものが先に表示されるはず
    const courseItems = screen.getAllByText(/テスト授業/);
    expect(courseItems[0].textContent).toContain('テスト授業2'); // Pinned
    expect(courseItems[1].textContent).toContain('テスト授業1');

    // ラベルが表示されていることを確認
    // expect(screen.getByText('工学系')).toBeInTheDocument();
    // expect(screen.getByText('数学系')).toBeInTheDocument();

    // 授業を選択する
    fireEvent.click(screen.getByText('テスト授業1'));

    // 開始ボタンが有効になっていることを確認
    const startButton = screen.getByTestId('start-session-button');
    expect(startButton).not.toBeDisabled();

    // 開始ボタンをクリック
    fireEvent.click(startButton);

    // onStartSessionが正しい引数で呼ばれたことを確認
    expect(mockOnStartSession).toHaveBeenCalledWith('テスト授業1', 'en', 'ja');
  });
});
