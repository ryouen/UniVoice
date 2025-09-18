/**
 * Language Update Fix Test
 * 
 * 問題：
 * - useUnifiedPipelineの初期化時に空文字の言語設定が渡される
 * - handleStartSessionで言語設定を更新しても、pipeline内部に反映されない
 * - 結果、startFromMicrophoneが空文字の言語設定で実行される
 * 
 * 解決：
 * - startFromMicrophone前にupdateLanguagesを呼び出す
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useUnifiedPipeline } from '../../src/hooks/useUnifiedPipeline';

// Mock window.univoice API
const mockUnivocAPI = {
  startListening: jest.fn(),
  stopListening: jest.fn(),
  onPipelineEvent: jest.fn(),
};

// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn();

describe('Language Update Fix', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup window.univoice
    (window as any).univoice = mockUnivocAPI;
    
    // Setup navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
      },
      writable: true,
    });
    
    // Mock getUserMedia to return a fake stream
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{
        stop: jest.fn(),
      }],
    });
    
    // Mock AudioContext
    (window as any).AudioContext = jest.fn(() => ({
      sampleRate: 48000,
      createMediaStreamSource: vi.fn(() => ({
        connect: jest.fn(),
      })),
      createScriptProcessor: vi.fn(() => ({
        connect: jest.fn(),
        disconnect: jest.fn(),
        onaudioprocess: null,
      })),
      destination: {},
      close: jest.fn(),
    }));
    
    // Mock successful startListening
    mockUnivocAPI.startListening.mockResolvedValue({ success: true });
  });

  it('should use updated languages when startFromMicrophone is called', async () => {
    const { result } = renderHook(() => useUnifiedPipeline({
      sourceLanguage: '',  // 初期値は空文字（問題の再現）
      targetLanguage: '',
    }));

    // 言語設定を更新
    act(() => {
      result.current.updateLanguages('en', 'ja');
    });

    // startFromMicrophoneを実行
    await act(async () => {
      await result.current.startFromMicrophone();
    });

    // startListeningが正しい言語設定で呼ばれることを確認
    expect(mockUnivocAPI.startListening).toHaveBeenCalledWith({
      sourceLanguage: 'en',
      targetLanguage: 'ja',
      correlationId: expect.any(String),
    });
  });

  it('should not use empty languages even if not updated', async () => {
    const { result } = renderHook(() => useUnifiedPipeline({
      sourceLanguage: 'en',  // デフォルト値を設定
      targetLanguage: 'ja',
    }));

    // 言語更新なしでstartFromMicrophoneを実行
    await act(async () => {
      await result.current.startFromMicrophone();
    });

    // デフォルト値が使われることを確認
    expect(mockUnivocAPI.startListening).toHaveBeenCalledWith({
      sourceLanguage: 'en',
      targetLanguage: 'ja',
      correlationId: expect.any(String),
    });
  });

  it('should reflect dynamic language updates', async () => {
    const { result } = renderHook(() => useUnifiedPipeline({
      sourceLanguage: 'en',
      targetLanguage: 'ja',
    }));

    // 最初の言語設定でスタート
    await act(async () => {
      await result.current.startFromMicrophone();
    });

    expect(mockUnivocAPI.startListening).toHaveBeenLastCalledWith({
      sourceLanguage: 'en',
      targetLanguage: 'ja',
      correlationId: expect.any(String),
    });

    // 停止
    await act(async () => {
      await result.current.stop();
    });

    // 言語を変更
    act(() => {
      result.current.updateLanguages('es', 'en');
    });

    // 新しい言語設定でスタート
    await act(async () => {
      await result.current.startFromMicrophone();
    });

    expect(mockUnivocAPI.startListening).toHaveBeenLastCalledWith({
      sourceLanguage: 'es',
      targetLanguage: 'en',
      correlationId: expect.any(String),
    });
  });

  it('should handle language update during active session gracefully', async () => {
    const { result } = renderHook(() => useUnifiedPipeline({
      sourceLanguage: 'en',
      targetLanguage: 'ja',
    }));

    // セッション開始
    await act(async () => {
      await result.current.startFromMicrophone();
    });

    // アクティブセッション中に言語を更新（次回のセッションで使用される）
    act(() => {
      result.current.updateLanguages('fr', 'de');
    });

    // 現在のセッションは影響を受けない
    expect(result.current.currentSourceLanguage).toBe('fr');
    expect(result.current.currentTargetLanguage).toBe('de');
  });
});