/**
 * useTranslationQueue - Translation Queue Management Hook
 * 
 * Responsibilities:
 * - Manage translation events and queue
 * - Handle high-quality translation updates
 * - Track active translations
 * - Manage segment/paragraph ID mappings
 * 
 * This hook abstracts all translation queue logic from the main pipeline
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { PipelineEvent } from '../shared/types/contracts';

interface UseTranslationQueueOptions {
  enabled?: boolean;
  onTranslationComplete?: (segmentId: string, translation: string, originalText: string) => void;
  onHighQualityTranslation?: (targetId: string, translationText: string, isParagraph: boolean) => void;
  onError?: (error: Error) => void;
}

interface UseTranslationQueueReturn {
  activeTranslations: Map<string, { original: string; translation: string }>;
  highQualityTranslations: Map<string, string>;
  handleTranslationEvent: (event: PipelineEvent) => void;
  clearTranslations: () => void;
  registerSegmentMapping: (segmentId: string, combinedId: string) => void;
  registerParagraphMapping: (paragraphId: string, data: any) => void;
  getMappedId: (segmentId: string) => string | undefined;
}

export function useTranslationQueue(
  options: UseTranslationQueueOptions = {}
): UseTranslationQueueReturn {
  const { enabled = true, onTranslationComplete, onHighQualityTranslation, onError } = options;
  
  const [activeTranslations] = useState(() => new Map<string, { original: string; translation: string }>());
  const [highQualityTranslations] = useState(() => new Map<string, string>());
  
  const segmentMapRef = useRef<Map<string, string>>(new Map());
  const paragraphMapRef = useRef<Map<string, any>>(new Map());
  const segmentBufferRef = useRef<Map<string, { original?: string; translation?: string }>>(new Map());


  // Handle translation events
  const handleTranslationEvent = useCallback((event: PipelineEvent) => {
    if (!enabled || event.type !== 'translation') return;
    
    const { segmentId, translatedText, isFinal, targetId, isHighQuality, isParagraph } = event.data;
    
    console.log('[useTranslationQueue] Translation event:', {
      segmentId,
      targetId,
      hasTranslation: !!translatedText,
      isFinal,
      isHighQuality,
      isParagraph
    });
    
    // Handle high-quality translation
    if (isHighQuality && targetId && translatedText) {
      highQualityTranslations.set(targetId, translatedText);
      
      if (onHighQualityTranslation) {
        onHighQualityTranslation(targetId, translatedText, isParagraph || false);
      }
      return;
    }
    
    // Handle regular translation
    if (segmentId && translatedText) {
      // Update segment buffer
      const existing = segmentBufferRef.current.get(segmentId) || {};
      segmentBufferRef.current.set(segmentId, {
        ...existing,
        translation: translatedText
      });
      
      // Track active translation
      const originalText = existing.original || '';
      activeTranslations.set(segmentId, {
        original: originalText,
        translation: translatedText
      });
      
      // If final, notify completion
      if (isFinal && onTranslationComplete) {
        onTranslationComplete(segmentId, translatedText, originalText);
        
        // Clean up
        activeTranslations.delete(segmentId);
        segmentBufferRef.current.delete(segmentId);
      }
    }
  }, [enabled, onTranslationComplete, onHighQualityTranslation, activeTranslations, highQualityTranslations]);

  // Register segment mapping (for combined sentences)
  const registerSegmentMapping = useCallback((segmentId: string, combinedId: string) => {
    segmentMapRef.current.set(segmentId, combinedId);
    console.log('[useTranslationQueue] Segment mapping registered:', segmentId, '->', combinedId);
  }, []);

  // Register paragraph mapping
  const registerParagraphMapping = useCallback((paragraphId: string, data: any) => {
    paragraphMapRef.current.set(paragraphId, data);
    console.log('[useTranslationQueue] Paragraph mapping registered:', paragraphId);
  }, []);

  // Get mapped ID for a segment
  const getMappedId = useCallback((segmentId: string): string | undefined => {
    return segmentMapRef.current.get(segmentId);
  }, []);

  // Clear all translations
  const clearTranslations = useCallback(() => {
    activeTranslations.clear();
    highQualityTranslations.clear();
    segmentMapRef.current.clear();
    paragraphMapRef.current.clear();
    segmentBufferRef.current.clear();
  }, [activeTranslations, highQualityTranslations]);


  return {
    activeTranslations,
    highQualityTranslations,
    handleTranslationEvent,
    clearTranslations,
    registerSegmentMapping,
    registerParagraphMapping,
    getMappedId
  };
}