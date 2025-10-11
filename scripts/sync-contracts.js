#!/usr/bin/env node
/**
 * Sync contracts types from electron to frontend
 * This script extracts type definitions from electron/services/ipc/contracts.ts
 * and generates a simplified version for frontend use
 */

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '../electron/services/ipc/contracts.ts');
const targetFile = path.join(__dirname, '../src/shared/types/contracts.ts');

// Read the source file
const sourceContent = fs.readFileSync(sourceFile, 'utf-8');

// Extract event types from discriminatedUnion
const eventTypeMatch = sourceContent.match(/export const PipelineEventSchema = z\.discriminatedUnion\('type', \[([\s\S]*?)\]\);/);
if (!eventTypeMatch) {
  console.error('Could not find PipelineEventSchema in source file');
  process.exit(1);
}

// Extract event type names
const eventSchemas = eventTypeMatch[1]
  .split(',')
  .map(s => {
    // Remove inline comments and whitespace
    const cleaned = s.replace(/\/\/.*$/gm, '').trim();
    return cleaned;
  })
  .filter(s => s.endsWith('EventSchema'))
  .map(s => s.replace('EventSchema', ''));

// Convert PascalCase to camelCase properly
const eventTypes = eventSchemas.map(type => {
  // Special cases
  if (type === 'ASR') return 'asr';
  if (type === 'CombinedSentence') return 'combinedSentence';
  if (type === 'FinalReport') return 'finalReport';
  if (type === 'ProgressiveSummary') return 'progressiveSummary';
  
  // General case: lowercase first letter
  return type.charAt(0).toLowerCase() + type.slice(1);
});

// Generate the simplified contracts file
const output = `// Shared type definitions for IPC contracts
// This file is auto-generated from electron/services/ipc/contracts.ts
// DO NOT EDIT MANUALLY - Run npm run sync-contracts instead

export interface PipelineEvent {
  type: ${eventTypes.map(t => `'${t}'`).join(' | ')};
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
`;

// Write the output file
fs.writeFileSync(targetFile, output);
console.log(`✅ Synced contracts from ${sourceFile} to ${targetFile}`);
console.log(`   Event types: ${eventTypes.join(', ')}`);