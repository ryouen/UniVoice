/**
 * TranscriptSection Component Unit Test
 * Clean Architecture: Test Layer
 *
 * テスト対象: TranscriptSection
 * 責任: リアルタイム文字起こし・翻訳表示のテスト
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TranscriptSection } from '../../../src/components/UniVoice/components/TranscriptSection/TranscriptSection';

describe('TranscriptSection Component', () => {
  const defaultProps = {
    isRunning: false,
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
    },
    theme: 'light' as const,
    fontScale: 1,
    displayMode: 'both' as const,
    volumeLevel: 0,
    debug: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Three-line Display Mode', () => {
    it('should display three lines of content when provided', () => {
      const props = {
        ...defaultProps,
        displayContent: {
          original: {
            oldest: '最も古いテキスト',
            older: '古いテキスト',
            recent: '最新のテキスト'
          },
          translation: {
            oldest: 'Oldest text',
            older: 'Older text',
            recent: 'Recent text'
          }
        }
      };

      render(<TranscriptSection {...props} />);

      // Original text
      expect(screen.getByText('最も古いテキスト')).toBeInTheDocument();
      expect(screen.getByText('古いテキスト')).toBeInTheDocument();
      expect(screen.getByText('最新のテキスト')).toBeInTheDocument();

      // Translation text
      expect(screen.getByText('Oldest text')).toBeInTheDocument();
      expect(screen.getByText('Older text')).toBeInTheDocument();
      expect(screen.getByText('Recent text')).toBeInTheDocument();
    });

    it('should apply correct opacity values', () => {
      const props = {
        ...defaultProps,
        displayContent: {
          original: {
            oldest: '最も古いテキスト',
            older: '古いテキスト',
            recent: '最新のテキスト'
          },
          translation: {
            oldest: 'Oldest text',
            older: 'Older text',
            recent: 'Recent text'
          }
        }
      };

      const { container } = render(<TranscriptSection {...props} />);

      const oldestOriginal = screen.getByText('最も古いテキスト');
      const olderOriginal = screen.getByText('古いテキスト');
      const recentOriginal = screen.getByText('最新のテキスト');

      expect(oldestOriginal).toHaveStyle({ opacity: '0.3' });
      expect(olderOriginal).toHaveStyle({ opacity: '0.6' });
      expect(recentOriginal).toHaveStyle({ opacity: '1' });
    });
  });

  describe('Display Modes', () => {
    it('should show only source when displayMode is source', () => {
      const props = {
        ...defaultProps,
        displayMode: 'source' as const,
        displayContent: {
          original: {
            recent: '日本語テキスト'
          },
          translation: {
            recent: 'English text'
          }
        }
      };

      render(<TranscriptSection {...props} />);

      expect(screen.getByText('日本語テキスト')).toBeInTheDocument();
      expect(screen.queryByText('English text')).not.toBeInTheDocument();
    });

    it('should show only target when displayMode is target', () => {
      const props = {
        ...defaultProps,
        displayMode: 'target' as const,
        displayContent: {
          original: {
            recent: '日本語テキスト'
          },
          translation: {
            recent: 'English text'
          }
        }
      };

      render(<TranscriptSection {...props} />);

      expect(screen.queryByText('日本語テキスト')).not.toBeInTheDocument();
      expect(screen.getByText('English text')).toBeInTheDocument();
    });

    it('should show both when displayMode is both', () => {
      const props = {
        ...defaultProps,
        displayMode: 'both' as const,
        displayContent: {
          original: {
            recent: '日本語テキスト'
          },
          translation: {
            recent: 'English text'
          }
        }
      };

      render(<TranscriptSection {...props} />);

      expect(screen.getByText('日本語テキスト')).toBeInTheDocument();
      expect(screen.getByText('English text')).toBeInTheDocument();
    });
  });

  describe('Theme Support', () => {
    it('should apply light theme colors', () => {
      const props = {
        ...defaultProps,
        theme: 'light' as const,
        displayContent: {
          original: {
            recent: 'Source text'
          },
          translation: {
            recent: 'Target text'
          }
        }
      };

      render(<TranscriptSection {...props} />);

      const sourceText = screen.getByText('Source text');
      const targetText = screen.getByText('Target text');

      expect(sourceText).toHaveStyle({ color: '#333' });
      expect(targetText).toHaveStyle({ color: '#0044cc' });
    });

    it('should apply dark theme colors', () => {
      const props = {
        ...defaultProps,
        theme: 'dark' as const,
        displayContent: {
          original: {
            recent: 'Source text'
          },
          translation: {
            recent: 'Target text'
          }
        }
      };

      render(<TranscriptSection {...props} />);

      const sourceText = screen.getByText('Source text');
      const targetText = screen.getByText('Target text');

      expect(sourceText).toHaveStyle({ color: '#ffffff' });
      expect(targetText).toHaveStyle({ color: '#ffffff' });
    });
  });

  describe('Font Scaling', () => {
    it('should apply font scale multiplier', () => {
      const props = {
        ...defaultProps,
        fontScale: 1.5,
        displayContent: {
          original: {
            recent: 'Scaled text'
          },
          translation: {
            recent: 'Scaled translation'
          }
        }
      };

      render(<TranscriptSection {...props} />);

      const sourceText = screen.getByText('Scaled text');
      expect(sourceText).toHaveStyle({ fontSize: '30px' }); // 20px * 1.5
    });

    it('should handle small font scale', () => {
      const props = {
        ...defaultProps,
        fontScale: 0.8,
        displayContent: {
          original: {
            recent: 'Small text'
          },
          translation: {
            recent: 'Small translation'
          }
        }
      };

      render(<TranscriptSection {...props} />);

      const sourceText = screen.getByText('Small text');
      expect(sourceText).toHaveStyle({ fontSize: '16px' }); // 20px * 0.8
    });
  });

  describe('Volume Level Indicator', () => {
    it('should show volume indicator when volumeLevel > 0 and isRunning', () => {
      const props = {
        ...defaultProps,
        volumeLevel: 0.5,
        isRunning: true
      };

      const { container } = render(<TranscriptSection {...props} />);
      const volumeIndicator = container.querySelector('[data-testid="volume-indicator"]');

      expect(volumeIndicator).toBeInTheDocument();
      expect(volumeIndicator?.firstChild).toHaveStyle({
        width: '50%',
        background: '#4CAF50'
      });
    });

    it('should show gray indicator when not running', () => {
      const props = {
        ...defaultProps,
        volumeLevel: 0.5,
        isRunning: false
      };

      const { container } = render(<TranscriptSection {...props} />);
      const volumeIndicator = container.querySelector('[data-testid="volume-indicator"]');

      expect(volumeIndicator?.firstChild).toHaveStyle({
        background: '#999'
      });
    });

    it('should not show volume indicator when volumeLevel is 0', () => {
      const props = {
        ...defaultProps,
        volumeLevel: 0,
        isRunning: true
      };

      const { container } = render(<TranscriptSection {...props} />);
      const volumeIndicator = container.querySelector('[data-testid="volume-indicator"]');

      expect(volumeIndicator).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should handle empty content gracefully', () => {
      const { container } = render(<TranscriptSection {...defaultProps} />);

      // Should render without errors
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should show minimum height for empty lines', () => {
      const props = {
        ...defaultProps,
        displayContent: {
          original: {
            oldest: '',
            older: '',
            recent: 'Only recent'
          },
          translation: {
            oldest: '',
            older: '',
            recent: 'Only recent translation'
          }
        }
      };

      render(<TranscriptSection {...props} />);

      const recentText = screen.getByText('Only recent');
      expect(recentText).toBeInTheDocument();
    });
  });

  describe('Grid Layout', () => {
    it('should use grid layout for three-line display', () => {
      const props = {
        ...defaultProps,
        displayContent: {
          original: {
            oldest: 'Line 1',
            older: 'Line 2',
            recent: 'Line 3'
          },
          translation: {
            oldest: 'Translation 1',
            older: 'Translation 2',
            recent: 'Translation 3'
          }
        }
      };

      const { container } = render(<TranscriptSection {...props} />);
      const gridContainer = container.querySelector('[data-testid="three-line-grid"]');

      expect(gridContainer).toHaveStyle({
        display: 'grid',
        gridTemplateRows: 'repeat(3, auto)'
      });
    });

    it('should adjust grid columns based on display mode', () => {
      const props = {
        ...defaultProps,
        displayMode: 'both' as const,
        displayContent: {
          original: { recent: 'Text' },
          translation: { recent: 'Translation' }
        }
      };

      const { container } = render(<TranscriptSection {...props} />);
      const gridContainer = container.querySelector('[data-testid="three-line-grid"]');

      expect(gridContainer).toHaveStyle({
        gridTemplateColumns: '1fr 1px 1fr'
      });
    });
  });

  describe('Debug Mode', () => {
    it('should log debug information when debug is true', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const props = {
        ...defaultProps,
        debug: true,
        displayContent: {
          original: { recent: 'Debug text' },
          translation: { recent: 'Debug translation' }
        }
      };

      render(<TranscriptSection {...props} />);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TranscriptSection]'),
        expect.objectContaining({
          hasDisplayContent: true
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const props = {
        ...defaultProps,
        displayContent: {
          original: { recent: 'Accessible text' },
          translation: { recent: 'Accessible translation' }
        }
      };

      const { container } = render(<TranscriptSection {...props} />);
      const transcriptSection = container.querySelector('[data-testid="transcript-section"]');

      expect(transcriptSection).toHaveAttribute('aria-label', 'Real-time transcript');
      expect(transcriptSection).toHaveAttribute('role', 'region');
    });

    it('should support screen readers with proper text hierarchy', () => {
      const props = {
        ...defaultProps,
        displayContent: {
          original: {
            oldest: 'Old',
            older: 'Older',
            recent: 'Recent'
          },
          translation: {
            oldest: 'Old trans',
            older: 'Older trans',
            recent: 'Recent trans'
          }
        }
      };

      render(<TranscriptSection {...props} />);

      // All text should be accessible
      expect(screen.getByText('Recent')).toBeInTheDocument();
      expect(screen.getByText('Recent trans')).toBeInTheDocument();
    });
  });
});