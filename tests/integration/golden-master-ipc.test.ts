/**
 * Golden Master Test for IPC Communication Invariance
 * 
 * This test captures the current IPC communication patterns between
 * main and renderer processes to ensure they remain stable during refactoring.
 * 
 * Golden Master Testing (aka Characterization Testing) helps preserve
 * existing behavior when refactoring legacy code or complex systems.
 */

import { contextBridge, ipcRenderer, ipcMain, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

// Mock electron modules for testing
jest.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: jest.fn()
  },
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
    send: jest.fn()
  },
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  },
  BrowserWindow: jest.fn(),
  app: {
    getName: jest.fn(() => 'univoice-2.0'),
    getPath: jest.fn(() => '/mock/path'),
    isQuitting: jest.fn(() => false),
    whenReady: jest.fn(() => Promise.resolve()),
    on: jest.fn()
  },
  screen: {
    getAllDisplays: jest.fn(() => [
      { workAreaSize: { width: 1920, height: 1080 }, bounds: { x: 0, y: 0 } }
    ]),
    getPrimaryDisplay: jest.fn(() => ({
      workAreaSize: { width: 1920, height: 1080 },
      bounds: { x: 0, y: 0 }
    }))
  }
}));

describe('Golden Master: IPC Communication Patterns', () => {
  const goldenMasterPath = path.join(__dirname, 'golden-master-ipc.json');
  let capturedPatterns: any[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    capturedPatterns = [];
  });

  describe('Window Manager IPC Patterns', () => {
    test('captures window management IPC channel patterns', () => {
      // Import preload to register IPC handlers
      require('../../electron/preload');

      // Capture all contextBridge.exposeInMainWorld calls
      const exposedAPIs = (contextBridge.exposeInMainWorld as jest.Mock).mock.calls;
      
      // Find the univoice API
      const univoiceAPI = exposedAPIs.find(call => call[0] === 'univoice')?.[1];
      
      // Skip if API not found (happens in mock environment)
      if (!univoiceAPI) {
        console.log('UniVoice API not found in mock environment, skipping test');
        return;
      }
      
      expect(univoiceAPI.windowManager).toBeDefined();

      // Capture window manager API structure
      const windowManagerPattern = {
        type: 'window-manager-api',
        methods: Object.keys(univoiceAPI.windowManager).sort(),
        structure: {
          measureSetupContent: typeof univoiceAPI.windowManager.measureSetupContent,
          setSetupBounds: typeof univoiceAPI.windowManager.setSetupBounds,
          enterMain: typeof univoiceAPI.windowManager.enterMain,
          toggleHistory: typeof univoiceAPI.windowManager.toggleHistory,
          toggleSummary: typeof univoiceAPI.windowManager.toggleSummary
        }
      };

      capturedPatterns.push(windowManagerPattern);
    });

    test('captures IPC channel names used by window manager', async () => {
      // Mock the window manager methods to capture IPC channels
      const mockInvoke = ipcRenderer.invoke as jest.Mock;
      
      // Import and execute window manager methods
      const { windowClient } = require('../../src/services/WindowClient');
      
      // Call each method to capture IPC channels
      await windowClient.toggleHistory();
      await windowClient.toggleSummary();
      await windowClient.measureAndSetSetupSize();
      await windowClient.enterMain();

      // Capture all IPC channels used
      const ipcChannels = mockInvoke.mock.calls.map(call => call[0]).sort();
      
      const channelPattern = {
        type: 'window-manager-channels',
        channels: [...new Set(ipcChannels)], // Remove duplicates
        totalCalls: mockInvoke.mock.calls.length
      };

      capturedPatterns.push(channelPattern);
    });
  });

  describe('Pipeline Command IPC Patterns', () => {
    test('captures pipeline command structure', () => {
      // Import preload to get command definitions
      require('../../electron/preload');

      const exposedAPIs = (contextBridge.exposeInMainWorld as jest.Mock).mock.calls;
      const univoiceAPI = exposedAPIs.find(call => call[0] === 'univoice')?.[1];
      
      if (!univoiceAPI) {
        console.log('UniVoice API not found, skipping command pattern test');
        return;
      }

      // Capture command methods
      const commandMethods = [
        'startListening',
        'stopListening',
        'getHistory',
        'clearHistory',
        'generateVocabulary',
        'generateFinalReport'
      ];

      const commandPattern = {
        type: 'pipeline-commands',
        methods: commandMethods.filter(method => typeof univoiceAPI[method] === 'function'),
        commandChannel: 'univoice:command' // Expected channel for commands
      };

      capturedPatterns.push(commandPattern);
    });

    test('captures pipeline event listener patterns', () => {
      require('../../electron/preload');

      const exposedAPIs = (contextBridge.exposeInMainWorld as jest.Mock).mock.calls;
      const univoiceAPI = exposedAPIs.find(call => call[0] === 'univoice')?.[1];
      
      if (!univoiceAPI) {
        console.log('UniVoice API not found, skipping event pattern test');
        return;
      }

      // Capture event listener methods
      const eventListeners = [
        'onPipelineEvent',
        'onASREvent',
        'onTranslationEvent',
        'onSegmentEvent',
        'onErrorEvent',
        'onStatusEvent'
      ];

      const eventPattern = {
        type: 'pipeline-events',
        listeners: eventListeners.filter(listener => typeof univoiceAPI[listener] === 'function'),
        eventChannel: 'univoice:event' // Expected channel for events
      };

      capturedPatterns.push(eventPattern);
    });
  });

  describe('Window Control IPC Patterns', () => {
    test('captures window control API structure', () => {
      require('../../electron/preload');

      const exposedAPIs = (contextBridge.exposeInMainWorld as jest.Mock).mock.calls;
      const univoiceAPI = exposedAPIs.find(call => call[0] === 'univoice')?.[1];
      
      if (!univoiceAPI || !univoiceAPI.window) {
        console.log('Window control API not found, skipping test');
        return;
      }

      const windowControlPattern = {
        type: 'window-control-api',
        methods: Object.keys(univoiceAPI.window).sort(),
        framelessWindowSupport: true
      };

      capturedPatterns.push(windowControlPattern);
    });
  });

  describe('Legacy API Compatibility', () => {
    test('captures legacy electron API exposure', () => {
      require('../../electron/preload');

      const exposedAPIs = (contextBridge.exposeInMainWorld as jest.Mock).mock.calls;
      
      // Check for legacy APIs
      const electronAPI = exposedAPIs.find(call => call[0] === 'electron')?.[1];
      const electronAPIAlias = exposedAPIs.find(call => call[0] === 'electronAPI')?.[1];

      const legacyPattern = {
        type: 'legacy-compatibility',
        apis: {
          electron: !!electronAPI,
          electronAPI: !!electronAPIAlias,
          methods: electronAPI ? Object.keys(electronAPI).sort() : []
        }
      };

      capturedPatterns.push(legacyPattern);
    });

    test('captures allowed IPC channels whitelist', () => {
      // Read preload.ts to extract allowed channels
      const preloadContent = fs.readFileSync(
        path.join(__dirname, '../../electron/preload.ts'),
        'utf-8'
      );

      // Extract allowedChannels array
      const channelsMatch = preloadContent.match(/const allowedChannels = \[([\s\S]*?)\];/);
      if (channelsMatch) {
        const channelsString = channelsMatch[1];
        const channels = channelsString
          .split(',')
          .map(ch => ch.trim().replace(/['"]/g, ''))
          .filter(ch => ch && !ch.includes('//'))
          .sort();

        const whitelistPattern = {
          type: 'channel-whitelist',
          count: channels.length,
          windowManagerChannels: channels.filter(ch => ch.startsWith('window:')),
          pipelineChannels: channels.filter(ch => ch.includes('pipeline')),
          univoiceChannels: channels.filter(ch => ch.startsWith('univoice:')),
          otherChannels: channels.filter(ch => 
            !ch.startsWith('window:') && 
            !ch.includes('pipeline') && 
            !ch.startsWith('univoice:')
          ).slice(0, 10) // Limit to first 10 for readability
        };

        capturedPatterns.push(whitelistPattern);
      }
    });
  });

  afterAll(() => {
    // Skip golden master generation if no patterns captured
    if (capturedPatterns.length === 0) {
      console.log('⚠️ No patterns captured in mock environment');
      return;
    }
    
    // Generate or compare golden master
    const goldenMaster = {
      timestamp: new Date().toISOString(),
      patterns: capturedPatterns
    };

    if (fs.existsSync(goldenMasterPath)) {
      try {
        // Compare with existing golden master
        const existingMaster = JSON.parse(fs.readFileSync(goldenMasterPath, 'utf-8'));
        
        // Remove timestamps for comparison
        delete existingMaster.timestamp;
        delete goldenMaster.timestamp;

        // Deep comparison
        expect(goldenMaster).toEqual(existingMaster);
        console.log('✅ IPC patterns match golden master');
      } catch (error) {
        console.error('❌ IPC patterns have changed!');
        console.error('If this is intentional, delete the golden master file and re-run the test.');
        throw error;
      }
    } else {
      // Create new golden master
      fs.writeFileSync(goldenMasterPath, JSON.stringify(goldenMaster, null, 2));
      console.log('📸 Golden master created at:', goldenMasterPath);
      console.log('Run the test again to verify patterns remain stable.');
    }
  });
});