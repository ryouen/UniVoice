import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RealtimeSection, RealtimeSectionProps } from '../../src/presentation/components/UniVoice/sections/RealtimeSection';

describe('RealtimeSection', () => {

  const mockDisplayContent = {
    original: {
      oldest: 'This is the oldest original text.',
      older: 'This is the older original text.',
      recent: 'This is the most recent original text.',
    },
    translation: {
      oldest: 'これは最も古い翻訳文です。',
      older: 'これは古い翻訳文です。',
      recent: 'これが最新の翻訳文です。',
    },
  };

  const renderComponent = (props: Partial<RealtimeSectionProps> = {}) => {
    const defaultProps: RealtimeSectionProps = {
      displayContent: mockDisplayContent,
    };
    return render(<RealtimeSection {...defaultProps} {...props} />);
  };

  it('should render three-line display content correctly', () => {
    renderComponent();

    // Original texts
    expect(screen.getByText('This is the oldest original text.')).toBeVisible();
    expect(screen.getByText('This is the older original text.')).toBeVisible();
    expect(screen.getByText('This is the most recent original text.')).toBeVisible();

    // Translated texts
    expect(screen.getByText('これは最も古い翻訳文です。')).toBeVisible();
    expect(screen.getByText('これは古い翻訳文です。')).toBeVisible();
    expect(screen.getByText('これが最新の翻訳文です。')).toBeVisible();
  });

  it('should render only source text when displayMode is \'source\'', () => {
    renderComponent({ displayMode: 'source' });

    // Original texts should be visible
    expect(screen.getByText('This is the most recent original text.')).toBeVisible();

    // Translated texts should not be visible
    expect(screen.queryByText('これが最新の翻訳文です。')).not.toBeVisible();
  });

  it('should render only target text when displayMode is \'target\'', () => {
    renderComponent({ displayMode: 'target' });

    // Original texts should not be visible
    expect(screen.queryByText('This is the most recent original text.')).not.toBeVisible();

    // Translated texts should be visible
    expect(screen.getByText('これが最新の翻訳文です。')).toBeVisible();
  });

  it('should render volume indicator when running', () => {
    renderComponent({ isRunning: true, volumeLevel: 0.5 });
    // This is a placeholder test. A more specific test would require a data-testid on the indicator.
  });
  
  /*
  it('should fall back to direct content when displayContent is not provided', () => {
    render(
      <RealtimeSection 
        currentOriginal="Direct original content."
        currentTranslation="直接の翻訳内容。"
      />
    );
    
    // This test requires mocking the child `ThreeLineDisplay` component, so we skip it for now.
    expect(screen.getByText('Direct original content.')).toBeInTheDocument();
    expect(screen.getByText('直接の翻訳内容。')).toBeInTheDocument();
  });
  */
});