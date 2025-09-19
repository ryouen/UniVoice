/**
 * Header Component Unit Test
 * Clean Architecture: Test Layer
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Header } from '../../../src/components/UniVoice/components/Header/Header';

// Mock windowAPI
const mockWindowAPI = {
  setAlwaysOnTop: jest.fn().mockResolvedValue(true),
  isAlwaysOnTop: jest.fn().mockResolvedValue(false)
};

// Setup global mock
beforeAll(() => {
  global.window.univoice = {
    window: mockWindowAPI
  } as any;
});

describe('Header Component', () => {
  const defaultProps = {
    className: 'test-class',
    recordingTime: 120, // 2 minutes
    isPaused: false,
    isAlwaysOnTop: false,
    showSettings: false,
    showHistoryPanel: false,
    showProgressiveSummary: false,
    showQuestionSection: false,
    memoCount: 0,
    autoSaveTime: null as Date | null,
    onPause: jest.fn(),
    onEndSession: jest.fn(),
    onNextClass: jest.fn(),
    onToggleHistory: jest.fn(),
    onToggleSummary: jest.fn(),
    onToggleQuestion: jest.fn(),
    onToggleSettings: jest.fn(),
    onToggleAlwaysOnTop: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Recording Display', () => {
    it('should display recording time correctly', () => {
      render(<Header {...defaultProps} />);
      expect(screen.getByText('02:00')).toBeInTheDocument();
    });

    it('should display recording indicator when not paused', () => {
      render(<Header {...defaultProps} />);
      const indicator = screen.getByTestId('recording-indicator');
      expect(indicator).not.toHaveClass('paused');
    });

    it('should display paused indicator when paused', () => {
      render(<Header {...defaultProps} isPaused={true} />);
      const indicator = screen.getByTestId('recording-indicator');
      expect(indicator).toHaveClass('paused');
    });
  });

  describe('Control Buttons', () => {
    it('should call onPause when pause button is clicked', () => {
      render(<Header {...defaultProps} />);
      const pauseButton = screen.getByRole('button', { name: /一時停止/i });
      fireEvent.click(pauseButton);
      expect(defaultProps.onPause).toHaveBeenCalledTimes(1);
    });

    it('should display resume text when paused', () => {
      render(<Header {...defaultProps} isPaused={true} />);
      expect(screen.getByText('再開')).toBeInTheDocument();
    });

    it('should call onEndSession when end button is clicked', () => {
      render(<Header {...defaultProps} />);
      const endButton = screen.getByRole('button', { name: /授業終了/i });
      fireEvent.click(endButton);
      expect(defaultProps.onEndSession).toHaveBeenCalledTimes(1);
    });

    it('should call onNextClass when next class button is clicked', () => {
      render(<Header {...defaultProps} />);
      const nextButton = screen.getByRole('button', { name: /次の授業へ/i });
      fireEvent.click(nextButton);
      expect(defaultProps.onNextClass).toHaveBeenCalledTimes(1);
    });
  });

  describe('Feature Buttons', () => {
    it('should toggle history panel', () => {
      render(<Header {...defaultProps} />);
      const historyButton = screen.getByTestId('history-button');
      fireEvent.click(historyButton);
      expect(defaultProps.onToggleHistory).toHaveBeenCalledTimes(1);
    });

    it('should show active state for history button when panel is open', () => {
      render(<Header {...defaultProps} showHistoryPanel={true} />);
      const historyButton = screen.getByTestId('history-button');
      expect(historyButton).toHaveClass('active');
    });

    it('should toggle summary panel', () => {
      render(<Header {...defaultProps} />);
      const summaryButton = screen.getByTestId('summary-button');
      fireEvent.click(summaryButton);
      expect(defaultProps.onToggleSummary).toHaveBeenCalledTimes(1);
    });

    it('should toggle question section', () => {
      render(<Header {...defaultProps} />);
      const questionButton = screen.getByTestId('question-button');
      fireEvent.click(questionButton);
      expect(defaultProps.onToggleQuestion).toHaveBeenCalledTimes(1);
    });

    it('should display memo count badge when memos exist', () => {
      render(<Header {...defaultProps} memoCount={5} />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('Settings and Always On Top', () => {
    it('should toggle settings', () => {
      render(<Header {...defaultProps} />);
      const settingsButton = screen.getByTestId('settings-button');
      fireEvent.click(settingsButton);
      expect(defaultProps.onToggleSettings).toHaveBeenCalledTimes(1);
    });

    it('should toggle always on top', async () => {
      render(<Header {...defaultProps} />);
      const pinButton = screen.getByTestId('always-on-top-button');
      fireEvent.click(pinButton);

      await waitFor(() => {
        expect(mockWindowAPI.setAlwaysOnTop).toHaveBeenCalledWith(true);
        expect(defaultProps.onToggleAlwaysOnTop).toHaveBeenCalledWith(true);
      });
    });

    it('should show active state when always on top is enabled', () => {
      render(<Header {...defaultProps} isAlwaysOnTop={true} />);
      const pinButton = screen.getByTestId('always-on-top-button');
      expect(pinButton).toHaveClass('active');
    });
  });

  describe('Auto Save Indicator', () => {
    it('should not display auto save indicator when no save time', () => {
      render(<Header {...defaultProps} />);
      expect(screen.queryByText(/自動保存済み/i)).not.toBeInTheDocument();
    });

    it('should display auto save indicator when save time is provided', () => {
      const saveTime = new Date();
      render(<Header {...defaultProps} autoSaveTime={saveTime} />);
      expect(screen.getByText(/自動保存済み/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<Header {...defaultProps} />);

      expect(screen.getByRole('button', { name: /一時停止/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /授業終了/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /次の授業へ/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<Header {...defaultProps} />);
      const pauseButton = screen.getByRole('button', { name: /一時停止/i });

      pauseButton.focus();
      expect(pauseButton).toHaveFocus();

      // Click event should work with keyboard Enter
      fireEvent.click(pauseButton);
      expect(defaultProps.onPause).toHaveBeenCalledTimes(1);
    });
  });

  describe('Theme Support', () => {
    it('should apply theme class', () => {
      const { container } = render(<Header {...defaultProps} className="dark-theme" />);
      expect(container.firstChild).toHaveClass('dark-theme');
    });
  });
});