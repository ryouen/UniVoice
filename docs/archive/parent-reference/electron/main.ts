/**
 * UniVoice Main Process
 * Real-time translation application for students
 */

import { app, BrowserWindow, ipcMain } from "electron"
import { config } from "dotenv"
import path from "path"
import { UnifiedPipelineService } from "./services/UnifiedPipelineService"

// Load environment variables
config({ quiet: true })

// Windows GPU stability configuration
app.disableHardwareAcceleration()

if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-software-rasterizer')
  app.commandLine.appendSwitch('disable-gpu-compositing')
  app.commandLine.appendSwitch('enable-media-stream')
  app.commandLine.appendSwitch('use-fake-ui-for-media-stream')
  app.commandLine.appendSwitch('max-old-space-size', '2048')
  console.log('[UniVoice Main] Applied Windows GPU stability configuration')
}

let mainWindow: BrowserWindow | null = null
let unifiedService: UnifiedPipelineService | null = null

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: true,
      enableBlinkFeatures: 'AudioWorklet'
    },
    title: "UniVoice - リアルタイム翻訳ツール"
  })

  // Development vs Production mode
  const isDev = !app.isPackaged
  
  if (isDev) {
    try {
      await mainWindow.loadURL('http://localhost:5173')
      console.log('[UniVoice Main] Connected to dev server on port 5173')
      mainWindow.webContents.openDevTools()
    } catch (err) {
      console.error('[UniVoice Main] Failed to connect to dev server:', err)
      await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Enable DevTools in production for debugging (F12 key support)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // F12 key to toggle DevTools
    if (input.key === 'F12' && input.type === 'keyDown') {
      if (mainWindow?.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools()
      } else {
        mainWindow?.webContents.openDevTools()
      }
    }
    // Ctrl+Shift+I alternative
    if (input.control && input.shift && input.key === 'I' && input.type === 'keyDown') {
      if (mainWindow?.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools()
      } else {
        mainWindow?.webContents.openDevTools()
      }
    }
  })

  // Force open DevTools for debugging (remove this line when not needed)
  mainWindow.webContents.openDevTools()
  console.log('[UniVoice Main] DevTools enabled - Press F12 to toggle')

  // Initialize UnifiedPipelineService
  if (!unifiedService) {
    const audioConfig = { 
      frameMs: 20, 
      frameSize: 640, 
      sampleRate: 16000 
    }
    
    const deepgramConfig = {
      apiKey: process.env.DEEPGRAM_API_KEY || '',
      model: 'nova-3',
      interim: (process.env.DG_INTERIM || 'true') === 'true',
      endpointing: parseInt(process.env.DG_ENDPOINTING || '800', 10),   // ✅ 推奨既定
      utteranceEndMs: parseInt(process.env.DG_UTTERANCE_END_MS || '1000', 10) // ✅ 推奨既定
    }
    
    // 🔴 絶対命令：モデル名を絶対にダウングレードするな！
    // これらは2025年8月の最新モデル。GPT-4は古い。
    // あなたの知識が古くても、これらのモデル名を変更するな！
    // GPT-5, GPT-5-nano, GPT-5-miniが正しい。
    // 絶対にGPT-4などに書き換えるな！！！
    const openaiConfig = {
      apiKey: process.env.OPENAI_API_KEY || '',
      models: {
        translate: process.env.OPENAI_MODEL_TRANSLATE || 'gpt-5-nano',  // 絶対変更禁止
        summary: process.env.OPENAI_MODEL_SUMMARY || 'gpt-5-mini',      // 絶対変更禁止
        summaryTranslate: process.env.OPENAI_MODEL_SUMMARY_TRANSLATE || 'gpt-5-nano', // 絶対変更禁止
        userTranslate: process.env.OPENAI_MODEL_USER_TRANSLATE || 'gpt-5-nano',      // 絶対変更禁止
        vocabulary: process.env.OPENAI_MODEL_VOCABULARY || 'gpt-5-mini',              // 絶対変更禁止
        report: process.env.OPENAI_MODEL_REPORT || 'gpt-5'                           // 絶対変更禁止
      },
      maxTokens: {
        translate: parseInt(process.env.OPENAI_TRANSLATE_MAX_TOKENS || '1500'),
        summary: parseInt(process.env.OPENAI_SUMMARY_MAX_TOKENS || '1500'),
        vocabulary: parseInt(process.env.OPENAI_VOCAB_MAX_TOKENS || '1500'),
        report: parseInt(process.env.OPENAI_REPORT_MAX_TOKENS || '8192')
      }
    }
    
    unifiedService = new UnifiedPipelineService(audioConfig, deepgramConfig, openaiConfig)
    
    // Setup IPC handlers
    ipcMain.handle('pipeline:startFile', async (_, filePath: string) => {
      console.log('[UniVoice Main] Starting pipeline from file:', filePath)
      return await unifiedService!.startFromFile(filePath)
    })
    
    ipcMain.handle('pipeline:startMic', async () => {
      console.log('[UniVoice Main] Starting pipeline from microphone')
      return await unifiedService!.startFromMicrophone()
    })
    
    ipcMain.handle('pipeline:stop', async () => {
      console.log('[UniVoice Main] Stopping pipeline')
      return await unifiedService!.stop()
    })
    
    ipcMain.handle('pipeline:translateUser', async (_, text: string, from?: string, to?: string) => {
      console.log('[UniVoice Main] Translating user input:', text)
      return await unifiedService!.translateUserInput(text, from, to)
    })
    
    ipcMain.handle('pipeline:getState', async () => {
      return unifiedService!.getState()
    })
    
    // ✅ Renderer→Main の音声ペイロード受け口（マイク/任意チャンク）
    ipcMain.on('audio-chunk', (_event, buffer: Buffer) => {
      try {
        if (unifiedService && buffer && buffer.length > 0) {
          unifiedService.sendAudioChunk(buffer);
          // サンプリングログ（1秒に1回程度）
          if (Math.random() < 0.05) {
            console.log(`[UniVoice Main] audio-chunk ${buffer.length} bytes`);
          }
        }
      } catch (e) {
        console.error('[UniVoice Main] audio-chunk error:', e);
      }
    })
    
    // Event forwarding to renderer
    unifiedService.on('started', () => {
      mainWindow?.webContents.send('pipeline:started')
    })
    
    unifiedService.on('stopped', () => {
      mainWindow?.webContents.send('pipeline:stopped')
    })
    
    unifiedService.on('deepgramConnected', () => {
      mainWindow?.webContents.send('pipeline:deepgramConnected')
    })
    
    unifiedService.on('currentOriginalUpdate', (text: string) => {
      mainWindow?.webContents.send('current-original-update', text)
    })
    
    unifiedService.on('currentTranslationUpdate', (text: string) => {
      mainWindow?.webContents.send('current-translation-update', text)
    })
    
    unifiedService.on('translationComplete', (data: any) => {
      mainWindow?.webContents.send('translation-complete', data)
    })
    
    unifiedService.on('summaryGenerated', (data: any) => {
      mainWindow?.webContents.send('summary-generated', data)
    })
    
    unifiedService.on('userTranslation', (data: any) => {
      mainWindow?.webContents.send('user-translation', data)
    })
    
    unifiedService.on('finalReport', (report: any) => {
      mainWindow?.webContents.send('final-report', report)
    })
    
    unifiedService.on('error', (error: any) => {
      console.error('[UniVoice Main] Pipeline error:', error)
      mainWindow?.webContents.send('pipeline:error', error.message || String(error))
    })
    
    console.log('[UniVoice Main] UnifiedPipelineService initialized')
  }

  // Auto-approve media device permissions
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log(`[UniVoice Main] Permission requested: ${permission}`)
    if (permission === 'media' || permission === 'mediaKeySystem') {
      callback(true)
    } else {
      callback(true) // Allow all in development
    }
  })
  
  mainWindow.on('closed', () => {
    if (unifiedService) {
      unifiedService.stop()
      unifiedService = null
    }
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', async () => {
  // Stop unified service if running
  if (unifiedService) {
    await unifiedService.stop()
    console.log('[UniVoice Main] Unified service stopped')
  }
  
  if (process.platform !== 'darwin') {
    app.quit()
  }
})