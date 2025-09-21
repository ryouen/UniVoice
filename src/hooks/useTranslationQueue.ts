/**
 * useTranslationQueue Hook
 * 
 * Responsible for managing translation events and queuing.
 * Follows Clean Architecture principles for separation of concerns.
 * 
 * @module hooks/useTranslationQueue
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { StreamBatcher } from '../utils/StreamBatcher';
import type { PipelineEvent } from '../shared/types/contracts';

/**
 * Translation segment information
 */
interface TranslationSegment {
  id: string;
  original: string;
  translation: string;
  timestamp: number;
  isHighQuality?: boolean;
  isParagraph?: boolean;
}

/**
 * Options for the translation queue hook
 */
interface UseTranslationQueueOptions {
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
  /** Callback when translation is complete */
  onTranslationComplete?: (segmentId: string, translation: string, originalText: string) => void;
  /** Callback for high-quality translation */
  onHighQualityTranslation?: (id: string, translation: string, isParagraph: boolean) => void;
  /** Error handler callback */
  onError?: (error: Error) => void;
  /** StreamBatcher configuration */
  streamBatchConfig?: {
    minInterval?: number;
    maxWait?: number;
    minChars?: number;
  };
}

/**
 * Return type for the translation queue hook
 */
interface UseTranslationQueueReturn {
  /** Active translations being processed */
  activeTranslations: Map<string, TranslationSegment>;
  /** High-quality translations cache */
  highQualityTranslations: Map<string, string>;
  /** Stream batcher instance */
  streamBatcher: StreamBatcher | null;
  /** Handler for translation events */
  handleTranslationEvent: (event: PipelineEvent) => void;
  /** Clear all translations */
  clearTranslations: () => void;
  /** Reset stream batcher */
  resetBatcher: () => void;
  /** Register segment to combined ID mapping */
  registerSegmentMapping: (segmentId: string, combinedId: string) => void;
  /** Register paragraph mapping */
  registerParagraphMapping: (paragraphId: string, data: any) => void;
  /** Get mapped ID (combined ID or original) */
  getMappedId: (segmentId: string, isParagraph: boolean) => string;
}

/**
 * Hook for managing translation queue and processing
 * 
 * @param options Configuration options
 * @returns Translation queue controls and state
 */
export const useTranslationQueue = (options: UseTranslationQueueOptions = {}): UseTranslationQueueReturn => {
  const {
    enabled = true,
    onTranslationComplete,
    onHighQualityTranslation,
    onError,
    streamBatchConfig = {
      minInterval: 100,
      maxWait: 200,
      minChars: 2
    }
  } = options;

  // State management
  const [activeTranslations] = useState<Map<string, TranslationSegment>>(new Map());
  const [highQualityTranslations] = useState<Map<string, string>>(new Map());

  // Mapping references
  const segmentToCombinedMapRef = useRef<Map<string, string>>(new Map());
  const paragraphMappingsRef = useRef<Map<string, any>>(new Map());

  // Stream batcher reference
  const streamBatcherRef = useRef<StreamBatcher | null>(null);

  /**
   * Initialize StreamBatcher
   */
  useEffect(() => {
    if (!enabled) return;

    if (!streamBatcherRef.current) {
      streamBatcherRef.current = new StreamBatcher(
        (batch) => {
          // Stream batches are now handled elsewhere
          console.log('[useTranslationQueue] Stream batch ready:', batch.substring(0, 50));
        },
        {
          minInterval: streamBatchConfig.minInterval ?? 100,
          maxWait: streamBatchConfig.maxWait ?? 200,
          minChars: streamBatchConfig.minChars ?? 2
        }
      );
    }

    return () => {
      if (streamBatcherRef.current) {
        streamBatcherRef.current.reset();
        streamBatcherRef.current = null;
      }
    };
  }, [enabled, streamBatchConfig]);

  /**
   * Register segment to combined ID mapping
   */
  const registerSegmentMapping = useCallback((segmentId: string, combinedId: string) => {
    segmentToCombinedMapRef.current.set(segmentId, combinedId);
    console.log('[useTranslationQueue] Segment mapping registered:', { segmentId, combinedId });
  }, []);

  /**
   * Register paragraph mapping
   */
  const registerParagraphMapping = useCallback((paragraphId: string, data: any) => {
    paragraphMappingsRef.current.set(paragraphId, data);
    console.log('[useTranslationQueue] Paragraph mapping registered:', { paragraphId, hasData: !!data });
  }, []);

  /**
   * Get mapped ID (combined ID or original)
   */
  const getMappedId = useCallback((segmentId: string, isParagraph: boolean): string => {
    if (isParagraph) {
      return segmentId;
    }
    return segmentToCombinedMapRef.current.get(segmentId) || segmentId;
  }, []);

  /**
   * Handle translation event
   */
  const handleTranslationEvent = useCallback((event: PipelineEvent) => {
    if (!enabled || event.type !== 'translation') return;

    console.log('[useTranslationQueue] Translation event received:', {
      segmentId: event.data.segmentId,
      hasTranslation: !!event.data.translatedText,
      isFinal: event.data.isFinal,
      textLength: event.data.translatedText?.length
    });

    const { segmentId, translatedText, originalText, isFinal } = event.data;

    // Handle high-quality or paragraph translation
    if (segmentId && (segmentId.startsWith('history_') || segmentId.startsWith('paragraph_'))) {
      const isParagraph = segmentId.startsWith('paragraph_');
      console.log(`[useTranslationQueue] ${isParagraph ? 'Paragraph' : 'History'} translation received:`, segmentId);

      // Remove prefix to get base ID
      const baseId = segmentId.replace(/^(history_|paragraph_)/, '');
      
      // Get target ID using mapping
      const targetId = getMappedId(baseId, isParagraph);
      const translationText = translatedText || event.data.content;

      console.log(`[useTranslationQueue] Mapping ${isParagraph ? 'paragraph' : 'history'} translation:`, {
        segmentId,
        baseId,
        targetId,
        isParagraph,
        hasMapping: !isParagraph && segmentToCombinedMapRef.current.has(baseId)
      });

      // Store high-quality translation
      if (translationText) {
        highQualityTranslations.set(targetId, translationText);
        console.log('[useTranslationQueue] High-quality translation stored:', targetId, translationText.substring(0, 50));

        // Callback for high-quality translation
        if (onHighQualityTranslation) {
          onHighQualityTranslation(targetId, translationText, isParagraph);
        }
      }

      // Don't process as regular translation
      return;
    }

    // Handle regular translation
    if (translatedText && segmentId) {
      // Update active translation
      const segment = activeTranslations.get(segmentId);
      if (segment) {
        segment.translation = translatedText;
      } else {
        activeTranslations.set(segmentId, {
          id: segmentId,
          original: originalText || '',
          translation: translatedText,
          timestamp: Date.now()
        });
      }

      // Handle final translation
      if (isFinal) {
        console.log('[useTranslationQueue] Translation complete:', segmentId);

        // Special handling for paragraph translations
        if (segmentId.startsWith('paragraph_')) {
          const paragraphId = segmentId.replace('paragraph_', '');
          const paragraphData = paragraphMappingsRef.current.get(paragraphId);

          if (paragraphData) {
            paragraphData.translation = translatedText;
            console.log('[useTranslationQueue] Updated paragraph data:', paragraphId);
          }
          return;
        }

        // Callback for regular translation completion
        if (onTranslationComplete) {
          onTranslationComplete(segmentId, translatedText, originalText || '');
        }

        // Clean up active translation
        activeTranslations.delete(segmentId);
      }
    }
  }, [enabled, onTranslationComplete, onHighQualityTranslation, getMappedId]);

  /**
   * Clear all translations
   */
  const clearTranslations = useCallback(() => {
    activeTranslations.clear();
    highQualityTranslations.clear();
    segmentToCombinedMapRef.current.clear();
    paragraphMappingsRef.current.clear();
    console.log('[useTranslationQueue] All translations cleared');
  }, [activeTranslations, highQualityTranslations]);

  /**
   * Reset stream batcher
   */
  const resetBatcher = useCallback(() => {
    if (streamBatcherRef.current) {
      streamBatcherRef.current.reset();
      console.log('[useTranslationQueue] Stream batcher reset');
    }
  }, []);

  return {
    activeTranslations,
    highQualityTranslations,
    streamBatcher: streamBatcherRef.current,
    handleTranslationEvent,
    clearTranslations,
    resetBatcher,
    registerSegmentMapping,
    registerParagraphMapping,
    getMappedId
  };
};