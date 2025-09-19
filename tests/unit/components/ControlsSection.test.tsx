/**
 * ControlsSection Component Unit Test
 * Clean Architecture: Test Layer
 *
 * テスト対象: ControlsSection
 * 責任: 設定・表示コントロールのテスト
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ControlsSection } from '../../../src/components/UniVoice/components/ControlsSection/ControlsSection';

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

describe('ControlsSection Component', () => {
  const defaultProps = {
    // Display State
    isVisible: true,
    currentTheme: 'light' as const,
    displayMode: 'both' as const,
    fontScale: 1,
    sourceLanguage: 'en',
    targetLanguage: 'ja',

    // Event Handlers
    onThemeChange: jest.fn(),
    onDisplayModeChange: jest.fn(),
    onFontScaleChange: jest.fn(),
    onSourceLanguageChange: jest.fn(),
    onTargetLanguageChange: jest.fn(),
    onToggleVisibility: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMatchMedia(false); // Default to desktop view
  });

  describe('Visibility Toggle', () => {
    it('should show controls when isVisible is true', () => {
      render(<ControlsSection {...defaultProps} />);
      expect(screen.getByTestId('controls-content')).toBeInTheDocument();
    });

    it('should hide controls when isVisible is false', () => {
      render(<ControlsSection {...defaultProps} isVisible={false} />);
      expect(screen.queryByTestId('controls-content')).not.toBeInTheDocument();
    });

    it('should call onToggleVisibility when toggle button is clicked', () => {
      render(<ControlsSection {...defaultProps} />);
      const toggleButton = screen.getByTestId('toggle-controls-button');
      fireEvent.click(toggleButton);
      expect(defaultProps.onToggleVisibility).toHaveBeenCalledTimes(1);
    });
  });

  describe('Theme Selection', () => {
    it('should display current theme', () => {
      render(<ControlsSection {...defaultProps} />);
      const lightButton = screen.getByRole('button', { name: /light/i });
      expect(lightButton).toHaveClass('active');
    });

    it('should call onThemeChange when theme button is clicked', () => {
      render(<ControlsSection {...defaultProps} />);
      const darkButton = screen.getByRole('button', { name: /dark/i });
      fireEvent.click(darkButton);
      expect(defaultProps.onThemeChange).toHaveBeenCalledWith('dark');
    });

    it('should show all theme options', () => {
      render(<ControlsSection {...defaultProps} />);
      expect(screen.getByRole('button', { name: /light/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /dark/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /purple/i })).toBeInTheDocument();
    });

    it('should highlight active theme', () => {
      const props = { ...defaultProps, currentTheme: 'dark' as const };
      render(<ControlsSection {...props} />);
      const darkButton = screen.getByRole('button', { name: /dark/i });
      expect(darkButton).toHaveClass('active');
    });
  });

  describe('Display Mode Selection', () => {
    it('should display current display mode', () => {
      render(<ControlsSection {...defaultProps} />);
      const bothButton = screen.getByRole('button', { name: /both/i });
      expect(bothButton).toHaveClass('active');
    });

    it('should call onDisplayModeChange when mode button is clicked', () => {
      render(<ControlsSection {...defaultProps} />);
      const sourceButton = screen.getByRole('button', { name: /source only/i });
      fireEvent.click(sourceButton);
      expect(defaultProps.onDisplayModeChange).toHaveBeenCalledWith('source');
    });

    it('should show all display mode options', () => {
      render(<ControlsSection {...defaultProps} />);
      expect(screen.getByRole('button', { name: /both/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /source only/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /target only/i })).toBeInTheDocument();
    });
  });

  describe('Font Scale Control', () => {
    it('should display current font scale', () => {
      render(<ControlsSection {...defaultProps} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should call onFontScaleChange when increase button is clicked', () => {
      render(<ControlsSection {...defaultProps} />);
      const increaseButton = screen.getByTestId('font-scale-increase');
      fireEvent.click(increaseButton);
      expect(defaultProps.onFontScaleChange).toHaveBeenCalledWith(1.1);
    });

    it('should call onFontScaleChange when decrease button is clicked', () => {
      render(<ControlsSection {...defaultProps} />);
      const decreaseButton = screen.getByTestId('font-scale-decrease');
      fireEvent.click(decreaseButton);
      expect(defaultProps.onFontScaleChange).toHaveBeenCalledWith(0.9);
    });

    it('should not decrease below minimum scale', () => {
      const props = { ...defaultProps, fontScale: 0.5 };
      render(<ControlsSection {...props} />);
      const decreaseButton = screen.getByTestId('font-scale-decrease');
      expect(decreaseButton).toBeDisabled();
    });

    it('should not increase above maximum scale', () => {
      const props = { ...defaultProps, fontScale: 2.0 };
      render(<ControlsSection {...props} />);
      const increaseButton = screen.getByTestId('font-scale-increase');
      expect(increaseButton).toBeDisabled();
    });

    it('should show reset button when scale is not 1', () => {
      const props = { ...defaultProps, fontScale: 1.5 };
      render(<ControlsSection {...props} />);
      const resetButton = screen.getByTestId('font-scale-reset');
      expect(resetButton).toBeInTheDocument();

      fireEvent.click(resetButton);
      expect(defaultProps.onFontScaleChange).toHaveBeenCalledWith(1);
    });
  });

  describe('Language Selection', () => {
    it('should display current source language', () => {
      render(<ControlsSection {...defaultProps} />);
      const sourceSelect = screen.getByLabelText(/source language/i) as HTMLSelectElement;
      expect(sourceSelect.value).toBe('en');
    });

    it('should display current target language', () => {
      render(<ControlsSection {...defaultProps} />);
      const targetSelect = screen.getByLabelText(/target language/i) as HTMLSelectElement;
      expect(targetSelect.value).toBe('ja');
    });

    it('should call onSourceLanguageChange when source language is changed', () => {
      render(<ControlsSection {...defaultProps} />);
      const sourceSelect = screen.getByLabelText(/source language/i);
      fireEvent.change(sourceSelect, { target: { value: 'ja' } });
      expect(defaultProps.onSourceLanguageChange).toHaveBeenCalledWith('ja');
    });

    it('should call onTargetLanguageChange when target language is changed', () => {
      render(<ControlsSection {...defaultProps} />);
      const targetSelect = screen.getByLabelText(/target language/i);
      fireEvent.change(targetSelect, { target: { value: 'en' } });
      expect(defaultProps.onTargetLanguageChange).toHaveBeenCalledWith('en');
    });

    it('should support multi-language source option', () => {
      render(<ControlsSection {...defaultProps} />);
      const sourceSelect = screen.getByLabelText(/source language/i) as HTMLSelectElement;
      const multiOption = Array.from(sourceSelect.options).find(opt => opt.value === 'multi');
      expect(multiOption).toBeDefined();
    });

    it('should show swap languages button', () => {
      render(<ControlsSection {...defaultProps} />);
      const swapButton = screen.getByTestId('swap-languages-button');
      expect(swapButton).toBeInTheDocument();

      fireEvent.click(swapButton);
      expect(defaultProps.onSourceLanguageChange).toHaveBeenCalledWith('ja');
      expect(defaultProps.onTargetLanguageChange).toHaveBeenCalledWith('en');
    });
  });

  describe('Keyboard Shortcuts Display', () => {
    it('should show keyboard shortcuts section', () => {
      render(<ControlsSection {...defaultProps} />);
      expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
    });

    it('should display common shortcuts', () => {
      render(<ControlsSection {...defaultProps} />);
      // Check for keyboard shortcut elements separately
      expect(screen.getByText('Space')).toBeInTheDocument();
      expect(screen.getByText('Pause/Resume')).toBeInTheDocument();
      expect(screen.getByText('Esc')).toBeInTheDocument();
      expect(screen.getByText('End Session')).toBeInTheDocument();
      expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
      expect(screen.getByText('Toggle Settings')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ControlsSection {...defaultProps} />);
      expect(screen.getByRole('region', { name: /controls and settings/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<ControlsSection {...defaultProps} />);
      const lightButton = screen.getByRole('button', { name: /light/i });

      lightButton.focus();
      expect(lightButton).toHaveFocus();

      // Tab to next button
      fireEvent.keyDown(lightButton, { key: 'Tab' });
      const darkButton = screen.getByRole('button', { name: /dark/i });
      // Note: Focus management would be handled by browser/React
    });

    it('should have proper role attributes for controls', () => {
      render(<ControlsSection {...defaultProps} />);
      const themeGroup = screen.getByRole('group', { name: /theme selection/i });
      expect(themeGroup).toBeInTheDocument();

      const displayGroup = screen.getByRole('group', { name: /display mode/i });
      expect(displayGroup).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should apply compact layout class on small screens', () => {
      // Mock window.matchMedia for mobile
      mockMatchMedia(true); // Mobile view

      const { container } = render(<ControlsSection {...defaultProps} />);
      expect(container.firstChild).toHaveClass('compact');
    });
  });

  describe('Theme-specific Styling', () => {
    it('should apply light theme styles', () => {
      const { container } = render(<ControlsSection {...defaultProps} currentTheme="light" />);
      expect(container.firstChild).toHaveClass('themeLight');
    });

    it('should apply dark theme styles', () => {
      const { container } = render(<ControlsSection {...defaultProps} currentTheme="dark" />);
      expect(container.firstChild).toHaveClass('themeDark');
    });

    it('should apply purple theme styles', () => {
      const { container } = render(<ControlsSection {...defaultProps} currentTheme="purple" />);
      expect(container.firstChild).toHaveClass('themePurple');
    });
  });
});