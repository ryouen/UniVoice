/**
 * Session Domain Model
 * Clean Architecture: Domain Layer (内側のレイヤー、外部に依存しない)
 */

export interface Session {
  id: string;
  className: string;
  sourceLanguage: string;
  targetLanguage: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  status: SessionStatus;
}

export enum SessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface SessionMetadata {
  className: string;
  sourceLanguage: string;
  targetLanguage: string;
  isResumed?: boolean;
  sessionNumber?: number;
  timestamp?: number;
}

export interface SessionLanguagePreferences {
  sourceLanguage: string;
  targetLanguage: string;
}

export interface SessionState {
  activeSession: Session | null;
  previousSession: Session | null;
  isStartingPipeline: boolean;
  isPaused: boolean;
  recordingTime: number;
}

/**
 * Session Value Object - 不変のセッション設定
 */
export class SessionConfiguration {
  constructor(
    public readonly className: string,
    public readonly sourceLanguage: string,
    public readonly targetLanguage: string
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.className || this.className.trim().length === 0) {
      throw new Error('Class name is required');
    }
    if (!this.sourceLanguage || !this.targetLanguage) {
      throw new Error('Both source and target languages are required');
    }
  }

  equals(other: SessionConfiguration): boolean {
    return (
      this.className === other.className &&
      this.sourceLanguage === other.sourceLanguage &&
      this.targetLanguage === other.targetLanguage
    );
  }

  toMetadata(): SessionMetadata {
    return {
      className: this.className,
      sourceLanguage: this.sourceLanguage,
      targetLanguage: this.targetLanguage
    };
  }
}

/**
 * Session Factory - セッション生成のビジネスルール
 */
export class SessionFactory {
  static createNewSession(config: SessionConfiguration): Session {
    return {
      id: this.generateSessionId(),
      className: config.className,
      sourceLanguage: config.sourceLanguage,
      targetLanguage: config.targetLanguage,
      startTime: new Date(),
      status: SessionStatus.ACTIVE
    };
  }

  static createFromSavedData(data: any): Session {
    const session: Session = {
      id: data.id || this.generateSessionId(),
      className: data.className,
      sourceLanguage: data.sourceLanguage,
      targetLanguage: data.targetLanguage,
      startTime: new Date(data.startTime),
      status: data.status || SessionStatus.ACTIVE
    };

    if (data.endTime) {
      session.endTime = new Date(data.endTime);
    }

    if (data.duration !== undefined) {
      session.duration = data.duration;
    }

    return session;
  }

  private static generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}