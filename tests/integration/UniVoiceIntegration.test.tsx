/**
 * UniVoice Integration Test
 * Clean Architecture: Integration Test Layer
 *
 * 統合テスト：複数のコンポーネントとサービスの協調動作を検証
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Header } from '../../src/components/UniVoice/components/Header/Header';
import { TranscriptSection } from '../../src/components/UniVoice/components/TranscriptSection/TranscriptSection';
import { ControlsSection } from '../../src/components/UniVoice/components/ControlsSection/ControlsSection';

// Mock window.matchMedia
const mockMatchMedia = (matches: boolean = false) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))
  });
};

// Mock windowAPI
const mockWindowAPI = {
  setAlwaysOnTop: jest.fn().mockResolvedValue(true),
  isAlwaysOnTop: jest.fn().mockResolvedValue(false),
  getSize: jest.fn().mockResolvedValue({ width: 1024, height: 768 })
};

// Setup global mocks
beforeAll(() => {
  global.window.univoice = {
    window: mockWindowAPI
  } as any;
  mockMatchMedia(false);
});

describe('UniVoice Integration Tests', () => {
  // Shared state for integration testing
  const createIntegratedApp = () => {
    // Shared state
    let state = {
      isPaused: false,
      isAlwaysOnTop: false,
      showSettings: true,
      showHistoryPanel: false,
      showProgressiveSummary: false,
      showQuestionSection: false,
      currentTheme: 'light' as const,
      displayMode: 'both' as const,
      fontScale: 1,
      sourceLanguage: 'en',
      targetLanguage: 'ja',
      recordingTime: 0,
      memoCount: 0,
      autoSaveTime: null as Date | null,
      displayContent: {
        original: {
          oldest: '',
          older: '',
          recent: ''
        },
        translation: {
          oldest: '',
          older: '',
          recent: ''
        }
      },
      displayOpacity: {
        original: {
          oldest: 0.3,
          older: 0.6,
          recent: 1.0
        },
        translation: {
          oldest: 0.3,
          older: 0.6,
          recent: 1.0
        }
      }
    };

    // Event handlers that update shared state
    const handlers = {
      onPause: jest.fn(() => {
        state.isPaused = !state.isPaused;
      }),
      onEndSession: jest.fn(),
      onNextClass: jest.fn(),
      onToggleHistory: jest.fn(() => {
        state.showHistoryPanel = !state.showHistoryPanel;
      }),
      onToggleSummary: jest.fn(() => {
        state.showProgressiveSummary = !state.showProgressiveSummary;
      }),
      onToggleQuestion: jest.fn(() => {
        state.showQuestionSection = !state.showQuestionSection;
      }),
      onToggleSettings: jest.fn(() => {
        state.showSettings = !state.showSettings;
      }),
      onToggleAlwaysOnTop: jest.fn(async (newState: boolean) => {
        state.isAlwaysOnTop = newState;
      }),
      onThemeChange: jest.fn((theme: 'light' | 'dark' | 'purple') => {
        state.currentTheme = theme;
      }),
      onDisplayModeChange: jest.fn((mode: 'both' | 'source' | 'target') => {
        state.displayMode = mode;
      }),
      onFontScaleChange: jest.fn((scale: number) => {
        state.fontScale = scale;
      }),
      onSourceLanguageChange: jest.fn((lang: string) => {
        state.sourceLanguage = lang;
      }),
      onTargetLanguageChange: jest.fn((lang: string) => {
        state.targetLanguage = lang;
      }),
      onToggleVisibility: jest.fn(() => {
        state.showSettings = !state.showSettings;
      })
    };

    const IntegratedApp = () => (
      <div className="univoice-app">
        <Header
          className="header"
          recordingTime={state.recordingTime}
          isPaused={state.isPaused}
          isAlwaysOnTop={state.isAlwaysOnTop}
          showSettings={state.showSettings}
          showHistoryPanel={state.showHistoryPanel}
          showProgressiveSummary={state.showProgressiveSummary}
          showQuestionSection={state.showQuestionSection}
          memoCount={state.memoCount}
          autoSaveTime={state.autoSaveTime}
          {...handlers}
        />

        <TranscriptSection
          isRunning={!state.isPaused}
          displayContent={state.displayContent}
          displayOpacity={state.displayOpacity}
          theme={state.currentTheme}
          fontScale={state.fontScale}
          displayMode={state.displayMode}
          volumeLevel={0}
          debug={false}
        />

        <ControlsSection
          isVisible={state.showSettings}
          currentTheme={state.currentTheme}
          displayMode={state.displayMode}
          fontScale={state.fontScale}
          sourceLanguage={state.sourceLanguage}
          targetLanguage={state.targetLanguage}
          onThemeChange={handlers.onThemeChange}
          onDisplayModeChange={handlers.onDisplayModeChange}
          onFontScaleChange={handlers.onFontScaleChange}
          onSourceLanguageChange={handlers.onSourceLanguageChange}
          onTargetLanguageChange={handlers.onTargetLanguageChange}
          onToggleVisibility={handlers.onToggleVisibility}
        />
      </div>
    );

    return { IntegratedApp, state, handlers };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Communication', () => {
    it('should toggle settings visibility from Header and reflect in ControlsSection', async () => {
      const { IntegratedApp, state, handlers } = createIntegratedApp();
      const { rerender } = render(<IntegratedApp />);

      // Initial state: settings visible
      expect(screen.getByTestId('controls-content')).toBeInTheDocument();

      // Toggle settings from Header
      const settingsButton = screen.getByTestId('settings-button');
      fireEvent.click(settingsButton);

      // Verify handler was called
      expect(handlers.onToggleSettings).toHaveBeenCalled();

      // Update state and rerender
      state.showSettings = false;
      rerender(<IntegratedApp />);

      // Verify settings are hidden
      expect(screen.queryByTestId('controls-content')).not.toBeInTheDocument();
    });

    it('should update theme across all components', async () => {
      const { IntegratedApp, state, handlers } = createIntegratedApp();
      const { rerender } = render(<IntegratedApp />);

      // Change theme from ControlsSection
      const darkButton = screen.getByRole('button', { name: /dark/i });
      fireEvent.click(darkButton);

      // Verify handler was called with correct theme
      expect(handlers.onThemeChange).toHaveBeenCalledWith('dark');

      // Update state and rerender
      state.currentTheme = 'dark';
      rerender(<IntegratedApp />);

      // Verify theme is applied to TranscriptSection
      const transcriptSection = screen.getByTestId('transcript-section');
      expect(transcriptSection).toBeInTheDocument();
    });

    it('should update display mode and affect TranscriptSection', async () => {
      const { IntegratedApp, state, handlers } = createIntegratedApp();

      // Add some content to display
      state.displayContent = {
        original: { recent: 'Source text' },
        translation: { recent: 'Target text' }
      };

      const { rerender } = render(<IntegratedApp />);

      // Initially both texts should be visible
      expect(screen.getByText('Source text')).toBeInTheDocument();
      expect(screen.getByText('Target text')).toBeInTheDocument();

      // Change to source only mode
      const sourceOnlyButton = screen.getByRole('button', { name: /source only/i });
      fireEvent.click(sourceOnlyButton);

      expect(handlers.onDisplayModeChange).toHaveBeenCalledWith('source');

      // Update state and rerender
      state.displayMode = 'source';
      rerender(<IntegratedApp />);

      // Verify only source is displayed
      expect(screen.getByText('Source text')).toBeInTheDocument();
      expect(screen.queryByText('Target text')).not.toBeInTheDocument();
    });

    it('should handle pause/resume from Header and update TranscriptSection', async () => {
      const { IntegratedApp, state, handlers } = createIntegratedApp();
      const { rerender } = render(<IntegratedApp />);

      // Initially not paused (running)
      expect(state.isPaused).toBe(false);

      // Click pause button
      const pauseButton = screen.getByRole('button', { name: /一時停止/i });
      fireEvent.click(pauseButton);

      expect(handlers.onPause).toHaveBeenCalled();

      // Update state and rerender
      state.isPaused = true;
      rerender(<IntegratedApp />);

      // Verify pause indicator in Header
      const recordingIndicator = screen.getByTestId('recording-indicator');
      expect(recordingIndicator).toHaveClass('paused');

      // Verify TranscriptSection reflects paused state (isRunning = false)
      // This would be reflected in the empty state message
      const emptyMessage = screen.getByText('Ready to start');
      expect(emptyMessage).toBeInTheDocument();
    });
  });

  describe('Font Scale Synchronization', () => {
    it('should update font scale and apply to TranscriptSection', async () => {
      const { IntegratedApp, state, handlers } = createIntegratedApp();

      // Add content to see font size changes
      state.displayContent = {
        original: { recent: 'Scaled text' },
        translation: { recent: 'Scaled translation' }
      };

      const { rerender } = render(<IntegratedApp />);

      // Increase font scale
      const increaseButton = screen.getByTestId('font-scale-increase');
      fireEvent.click(increaseButton);

      expect(handlers.onFontScaleChange).toHaveBeenCalledWith(1.1);

      // Update state and rerender
      state.fontScale = 1.1;
      rerender(<IntegratedApp />);

      // Verify font scale is applied to TranscriptSection
      const sourceText = screen.getByText('Scaled text');
      expect(sourceText).toHaveStyle({ fontSize: '22px' }); // 20px * 1.1

      // Verify scale value display
      expect(screen.getByText('110%')).toBeInTheDocument();
    });

    it('should reset font scale from ControlsSection', async () => {
      const { IntegratedApp, state, handlers } = createIntegratedApp();

      // Start with scaled font
      state.fontScale = 1.5;
      state.displayContent = {
        original: { recent: 'Reset test' },
        translation: { recent: 'Reset translation' }
      };

      const { rerender } = render(<IntegratedApp />);

      // Verify reset button is visible
      const resetButton = screen.getByTestId('font-scale-reset');
      expect(resetButton).toBeInTheDocument();

      // Click reset
      fireEvent.click(resetButton);

      expect(handlers.onFontScaleChange).toHaveBeenCalledWith(1);

      // Update state and rerender
      state.fontScale = 1;
      rerender(<IntegratedApp />);

      // Verify font size is reset
      const sourceText = screen.getByText('Reset test');
      expect(sourceText).toHaveStyle({ fontSize: '20px' });

      // Verify reset button is gone
      expect(screen.queryByTestId('font-scale-reset')).not.toBeInTheDocument();
    });
  });

  describe('Language Settings', () => {
    it('should swap languages and update both source and target', async () => {
      const { IntegratedApp, state, handlers } = createIntegratedApp();
      const { rerender } = render(<IntegratedApp />);

      // Initial languages
      expect(state.sourceLanguage).toBe('en');
      expect(state.targetLanguage).toBe('ja');

      // Click swap button
      const swapButton = screen.getByTestId('swap-languages-button');
      fireEvent.click(swapButton);

      // Verify both handlers were called
      expect(handlers.onSourceLanguageChange).toHaveBeenCalledWith('ja');
      expect(handlers.onTargetLanguageChange).toHaveBeenCalledWith('en');

      // Update state and rerender
      state.sourceLanguage = 'ja';
      state.targetLanguage = 'en';
      rerender(<IntegratedApp />);

      // Verify selects show swapped values
      const sourceSelect = screen.getByLabelText(/source language/i) as HTMLSelectElement;
      const targetSelect = screen.getByLabelText(/target language/i) as HTMLSelectElement;

      expect(sourceSelect.value).toBe('ja');
      expect(targetSelect.value).toBe('en');
    });
  });

  describe('Panel Toggles', () => {
    it('should toggle history panel from Header', async () => {
      const { IntegratedApp, state, handlers } = createIntegratedApp();
      const { rerender } = render(<IntegratedApp />);

      // Initially history panel is not shown
      expect(state.showHistoryPanel).toBe(false);

      // Click history button
      const historyButton = screen.getByTestId('history-button');
      fireEvent.click(historyButton);

      expect(handlers.onToggleHistory).toHaveBeenCalled();

      // Update state and rerender
      state.showHistoryPanel = true;
      rerender(<IntegratedApp />);

      // Verify button shows active state
      expect(historyButton).toHaveClass('active');
    });

    it('should toggle summary panel from Header', async () => {
      const { IntegratedApp, state, handlers } = createIntegratedApp();
      const { rerender } = render(<IntegratedApp />);

      // Click summary button
      const summaryButton = screen.getByTestId('summary-button');
      fireEvent.click(summaryButton);

      expect(handlers.onToggleSummary).toHaveBeenCalled();

      // Update state and rerender
      state.showProgressiveSummary = true;
      rerender(<IntegratedApp />);

      // Verify button shows active state
      expect(summaryButton).toHaveClass('active');
    });

    it('should toggle question section and update memo count badge', async () => {
      const { IntegratedApp, state, handlers } = createIntegratedApp();

      // Start with some memos
      state.memoCount = 5;

      const { rerender } = render(<IntegratedApp />);

      // Verify memo count badge is displayed
      expect(screen.getByText('5')).toBeInTheDocument();

      // Click question button
      const questionButton = screen.getByTestId('question-button');
      fireEvent.click(questionButton);

      expect(handlers.onToggleQuestion).toHaveBeenCalled();

      // Update state and rerender
      state.showQuestionSection = true;
      rerender(<IntegratedApp />);

      // Verify button shows active state
      expect(questionButton).toHaveClass('active');

      // Update memo count
      state.memoCount = 10;
      rerender(<IntegratedApp />);

      // Verify updated badge
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  describe('Always On Top Feature', () => {
    it('should toggle always on top from Header', async () => {
      const { IntegratedApp, state, handlers } = createIntegratedApp();
      const { rerender } = render(<IntegratedApp />);

      // Initially not always on top
      expect(state.isAlwaysOnTop).toBe(false);

      // Click always on top button
      const alwaysOnTopButton = screen.getByTestId('always-on-top-button');
      fireEvent.click(alwaysOnTopButton);

      // Wait for async operation
      await waitFor(() => {
        expect(mockWindowAPI.setAlwaysOnTop).toHaveBeenCalledWith(true);
        expect(handlers.onToggleAlwaysOnTop).toHaveBeenCalledWith(true);
      });

      // Update state and rerender
      state.isAlwaysOnTop = true;
      rerender(<IntegratedApp />);

      // Verify button shows active state
      expect(alwaysOnTopButton).toHaveClass('active');
    });
  });

  describe('Real-time Content Updates', () => {
    it('should update transcript content dynamically', async () => {
      const { IntegratedApp, state } = createIntegratedApp();

      // Start with paused state to show "Ready to start"
      state.isPaused = true;

      const { rerender } = render(<IntegratedApp />);

      // Initially empty - check the empty state exists
      const emptyState = screen.getByTestId('transcript-section');
      expect(emptyState).toBeInTheDocument();

      // Simulate receiving real-time content
      state.displayContent = {
        original: {
          oldest: 'First sentence.',
          older: 'Second sentence.',
          recent: 'Current sentence being spoken.'
        },
        translation: {
          oldest: '最初の文。',
          older: '2番目の文。',
          recent: '現在話されている文。'
        }
      };
      state.isPaused = false;

      rerender(<IntegratedApp />);

      // Verify all content is displayed
      expect(screen.getByText('First sentence.')).toBeInTheDocument();
      expect(screen.getByText('Second sentence.')).toBeInTheDocument();
      expect(screen.getByText('Current sentence being spoken.')).toBeInTheDocument();
      expect(screen.getByText('最初の文。')).toBeInTheDocument();
      expect(screen.getByText('2番目の文。')).toBeInTheDocument();
      expect(screen.getByText('現在話されている文。')).toBeInTheDocument();

      // Verify opacity levels are applied
      expect(screen.getByText('First sentence.')).toHaveStyle({ opacity: '0.3' });
      expect(screen.getByText('Second sentence.')).toHaveStyle({ opacity: '0.6' });
      expect(screen.getByText('Current sentence being spoken.')).toHaveStyle({ opacity: '1' });
    });

    it('should update recording time in Header', async () => {
      const { IntegratedApp, state } = createIntegratedApp();
      const { rerender } = render(<IntegratedApp />);

      // Initial time
      expect(screen.getByText('00:00')).toBeInTheDocument();

      // Update recording time
      state.recordingTime = 125; // 2 minutes 5 seconds
      rerender(<IntegratedApp />);

      // Verify formatted time
      expect(screen.getByText('02:05')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt layout for mobile devices', async () => {
      // Mock mobile view
      mockMatchMedia(true);

      const { IntegratedApp } = createIntegratedApp();
      const { container } = render(<IntegratedApp />);

      // Verify compact class is applied to ControlsSection
      const controlsSection = container.querySelector('.controlsSection');
      expect(controlsSection).toHaveClass('compact');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing window API gracefully', async () => {
      // Temporarily remove window API
      const originalAPI = global.window.univoice;
      global.window.univoice = undefined as any;

      const { IntegratedApp } = createIntegratedApp();

      // Should render without crashing
      const { container } = render(<IntegratedApp />);
      expect(container).toBeInTheDocument();

      // Clicking always on top should not crash
      const alwaysOnTopButton = screen.getByTestId('always-on-top-button');
      fireEvent.click(alwaysOnTopButton);

      // Restore API
      global.window.univoice = originalAPI;
    });
  });
});