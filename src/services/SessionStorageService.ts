/**
 * SessionStorageService - Session data persistence service
 * 
 * Clean Architecture: Infrastructure Layer
 * Handles localStorage access for session-related data
 */

export interface SessionData {
  className: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp?: number;  // オプショナルで追加（後方互換性）
}

export interface SessionDataWithVersion extends SessionData {
  version: number;
  timestamp: number;
}

export interface LanguagePreferences {
  sourceLanguage: string;
  targetLanguage: string;
}

export class SessionStorageService {
  private static instance: SessionStorageService;
  
  private readonly LANGUAGE_KEYS = {
    SOURCE: 'sourceLanguage',
    TARGET: 'targetLanguage'
  } as const;
  
  private readonly ACTIVE_SESSION_KEY = 'univoice-active-session';
  private readonly CURRENT_VERSION = 1;

  /**
   * Get singleton instance
   */
  static getInstance(): SessionStorageService {
    if (!this.instance) {
      this.instance = new SessionStorageService();
    }
    return this.instance;
  }

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {}

  /**
   * Save language preferences
   */
  saveLanguagePreferences(preferences: LanguagePreferences): void {
    try {
      localStorage.setItem(this.LANGUAGE_KEYS.SOURCE, preferences.sourceLanguage);
      localStorage.setItem(this.LANGUAGE_KEYS.TARGET, preferences.targetLanguage);
    } catch (error) {
      console.error('[SessionStorageService] Failed to save language preferences:', error);
    }
  }

  /**
   * Load language preferences
   */
  loadLanguagePreferences(): LanguagePreferences | null {
    try {
      const sourceLanguage = localStorage.getItem(this.LANGUAGE_KEYS.SOURCE);
      const targetLanguage = localStorage.getItem(this.LANGUAGE_KEYS.TARGET);
      
      if (sourceLanguage && targetLanguage) {
        return { sourceLanguage, targetLanguage };
      }
      return null;
    } catch (error) {
      console.error('[SessionStorageService] Failed to load language preferences:', error);
      return null;
    }
  }

  /**
   * Save active session data
   */
  saveActiveSession(sessionData: SessionData): void {
    try {
      const dataWithVersion: SessionDataWithVersion = {
        ...sessionData,
        version: this.CURRENT_VERSION,
        timestamp: Date.now()
      };
      
      localStorage.setItem(this.ACTIVE_SESSION_KEY, JSON.stringify(dataWithVersion));
      console.log('[SessionStorageService] Active session saved:', {
        className: sessionData.className,
        languages: { source: sessionData.sourceLanguage, target: sessionData.targetLanguage },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[SessionStorageService] Failed to save active session:', error);
    }
  }
  
  /**
   * Load active session data
   */
  loadActiveSession(): SessionData | null {
    try {
      const stored = localStorage.getItem(this.ACTIVE_SESSION_KEY);
      if (!stored) {
        return null;
      }
      
      const parsed = JSON.parse(stored) as SessionDataWithVersion;
      
      // Version check for future migrations
      if (parsed.version !== this.CURRENT_VERSION) {
        console.warn('[SessionStorageService] Session version mismatch:', {
          stored: parsed.version,
          current: this.CURRENT_VERSION
        });
        // Future: Add migration logic here
      }
      
      // Validate required fields
      if (!parsed.className || !parsed.sourceLanguage || !parsed.targetLanguage) {
        console.warn('[SessionStorageService] Invalid session data:', parsed);
        return null;
      }
      
      console.log('[SessionStorageService] Active session loaded:', {
        className: parsed.className,
        languages: { source: parsed.sourceLanguage, target: parsed.targetLanguage },
        savedAt: new Date(parsed.timestamp).toISOString()
      });
      
      return {
        className: parsed.className,
        sourceLanguage: parsed.sourceLanguage,
        targetLanguage: parsed.targetLanguage,
        timestamp: parsed.timestamp  // timestampも返すように修正
      };
    } catch (error) {
      console.error('[SessionStorageService] Failed to load active session:', error);
      return null;
    }
  }
  
  /**
   * Clear active session data
   */
  clearActiveSession(): void {
    try {
      localStorage.removeItem(this.ACTIVE_SESSION_KEY);
      console.log('[SessionStorageService] Active session cleared');
    } catch (error) {
      console.error('[SessionStorageService] Failed to clear active session:', error);
    }
  }
  
  /**
   * Clear all session data
   */
  clearSessionData(): void {
    try {
      // Clear all session-related data
      localStorage.removeItem(this.LANGUAGE_KEYS.SOURCE);
      localStorage.removeItem(this.LANGUAGE_KEYS.TARGET);
      localStorage.removeItem(this.ACTIVE_SESSION_KEY);
    } catch (error) {
      console.error('[SessionStorageService] Failed to clear session data:', error);
    }
  }
}

// Export singleton instance
export const sessionStorageService = SessionStorageService.getInstance();