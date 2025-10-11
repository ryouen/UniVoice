// Shared type definitions for IPC contracts
// This file is auto-generated from electron/services/ipc/contracts.ts
// DO NOT EDIT MANUALLY - Run npm run sync-contracts instead

export interface PipelineEvent {
  type: 'asr' | 'translation' | 'segment' | 'progressiveSummary' | 'error' | 'status' | 'vocabulary' | 'finalReport' | 'combinedSentence' | 'paragraphComplete';
  timestamp: number;
  correlationId: string;
  data: any; // Simplified for now
}

export interface StartListeningCommand {
  command: 'startListening';
  params: {
    sourceLanguage: string;
    targetLanguage: string;
    correlationId: string;
  };
}

export interface StopListeningCommand {
  command: 'stopListening';
  params: {
    correlationId: string;
  };
}

export interface GetHistoryCommand {
  command: 'getHistory';
  params: {
    limit?: number;
    offset?: number;
  };
}

export interface ClearHistoryCommand {
  command: 'clearHistory';
  params: {};
}

export interface GenerateVocabularyCommand {
  command: 'generateVocabulary';
  params: {
    correlationId: string;
  };
}

export interface GenerateFinalReportCommand {
  command: 'generateFinalReport';
  params: {
    correlationId: string;
  };
}

export interface TranslateParagraphCommand {
  command: 'translateParagraph';
  params: {
    paragraphId: string;
    sourceText: string;
    sourceLanguage: string;
    targetLanguage: string;
    correlationId: string;
  };
}

export type IPCCommand = 
  | StartListeningCommand
  | StopListeningCommand
  | GetHistoryCommand
  | ClearHistoryCommand
  | GenerateVocabularyCommand
  | GenerateFinalReportCommand
  | TranslateParagraphCommand;
