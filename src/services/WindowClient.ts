/**
 * WindowClient - Thin wrapper for window management from renderer process
 * 
 * 責務:
 * - レンダラープロセスからウィンドウ管理APIへのアクセス
 * - 将来的な拡張性を保ちつつ、シンプルなインターフェースを提供
 */

export class WindowClient {
  private static instance: WindowClient;

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): WindowClient {
    if (!this.instance) {
      this.instance = new WindowClient();
    }
    return this.instance;
  }

  /**
   * プライベートコンストラクタ（シングルトンパターン）
   */
  private constructor() {
    // 初期化処理は不要（薄いラッパー）
  }

  /**
   * 履歴ウィンドウのトグル
   */
  async toggleHistory(): Promise<boolean> {
    try {
      if (!window.univoice?.windowManager) {
        console.warn('[WindowClient] windowManager API not available');
        return false;
      }
      return await window.univoice.windowManager.toggleHistory();
    } catch (error) {
      console.error('[WindowClient] Failed to toggle history window:', error);
      return false;
    }
  }

  /**
   * 要約ウィンドウのトグル
   */
  async toggleSummary(): Promise<boolean> {
    try {
      if (!window.univoice?.windowManager) {
        console.warn('[WindowClient] windowManager API not available');
        return false;
      }
      return await window.univoice.windowManager.toggleSummary();
    } catch (error) {
      console.error('[WindowClient] Failed to toggle summary window:', error);
      return false;
    }
  }

  /**
   * Setup画面のコンテンツサイズを計測して設定
   * @deprecated 動的リサイズは無限ループを引き起こすため無効化
   */
  async measureAndSetSetupSize(): Promise<boolean> {
    // 無効化: 動的なコンテンツベースのリサイズは無限ループを引き起こすため
    // Setup画面のサイズはWindowRegistry.tsで定義された固定サイズを使用
    console.info('[WindowClient] measureAndSetSetupSize is disabled to prevent resize loops');
    return true;
  }

  /**
   * Setup画面からMain画面への遷移
   */
  async enterMain(): Promise<boolean> {
    try {
      if (!window.univoice?.windowManager) {
        console.warn('[WindowClient] windowManager API not available');
        return false;
      }
      return await window.univoice.windowManager.enterMain();
    } catch (error) {
      console.error('[WindowClient] Failed to enter main window:', error);
      return false;
    }
  }

  /**
   * ウィンドウ最小化
   */
  async minimize(): Promise<void> {
    try {
      if (!window.univoice?.window) {
        console.warn('[WindowClient] window API not available');
        return;
      }
      await window.univoice.window.minimize();
    } catch (error) {
      console.error('[WindowClient] Failed to minimize window:', error);
    }
  }

  /**
   * ウィンドウ最大化
   */
  async maximize(): Promise<void> {
    try {
      if (!window.univoice?.window) {
        console.warn('[WindowClient] window API not available');
        return;
      }
      await window.univoice.window.maximize();
    } catch (error) {
      console.error('[WindowClient] Failed to maximize window:', error);
    }
  }

  /**
   * ウィンドウ最大化解除
   */
  async unmaximize(): Promise<void> {
    try {
      if (!window.univoice?.window) {
        console.warn('[WindowClient] window API not available');
        return;
      }
      await window.univoice.window.unmaximize();
    } catch (error) {
      console.error('[WindowClient] Failed to unmaximize window:', error);
    }
  }

  /**
   * ウィンドウクローズ
   */
  async close(): Promise<void> {
    try {
      if (!window.univoice?.window) {
        console.warn('[WindowClient] window API not available');
        return;
      }
      await window.univoice.window.close();
    } catch (error) {
      console.error('[WindowClient] Failed to close window:', error);
    }
  }

  /**
   * ウィンドウが最大化されているかチェック
   */
  async isMaximized(): Promise<boolean> {
    try {
      if (!window.univoice?.window) {
        console.warn('[WindowClient] window API not available');
        return false;
      }
      return await window.univoice.window.isMaximized();
    } catch (error) {
      console.error('[WindowClient] Failed to check if maximized:', error);
      return false;
    }
  }

  /**
   * 常に最前面表示の設定
   */
  async setAlwaysOnTop(alwaysOnTop: boolean): Promise<boolean> {
    try {
      if (!window.univoice?.window) {
        console.warn('[WindowClient] window API not available');
        return false;
      }
      return await window.univoice.window.setAlwaysOnTop(alwaysOnTop);
    } catch (error) {
      console.error('[WindowClient] Failed to set always on top:', error);
      return false;
    }
  }

  /**
   * 常に最前面表示かチェック
   */
  async isAlwaysOnTop(): Promise<boolean> {
    try {
      if (!window.univoice?.window) {
        console.warn('[WindowClient] window API not available');
        return false;
      }
      return await window.univoice.window.isAlwaysOnTop();
    } catch (error) {
      console.error('[WindowClient] Failed to check if always on top:', error);
      return false;
    }
  }
  
  /**
   * ウィンドウサイズ設定
   */
  async setBounds(bounds: { width: number; height: number }): Promise<void> {
    try {
      if (!window.univoice?.window) {
        console.warn('[WindowClient] window API not available');
        return;
      }
      await window.univoice.window.setBounds(bounds);
    } catch (error) {
      console.error('[WindowClient] Failed to set bounds:', error);
    }
  }
}

// Export singleton instance for convenience
export const windowClient = WindowClient.getInstance();