/**
 * 現在の機能を検証するE2Eテスト
 * 
 * リファクタリング前の動作を記録し、
 * リファクタリング後も同じ動作をすることを保証する
 */

import { test, expect } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import { _electron as electron } from 'playwright';
import path from 'path';

let electronApp: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  // Electronアプリを起動
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../dist-electron/main.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DEEPGRAM_API_KEY: 'test-key',
      OPENAI_API_KEY: 'test-key'
    }
  });
  
  // メインウィンドウを取得
  page = await electronApp.firstWindow();
  
  // DevToolsを閉じる
  await page.evaluate(() => {
    if ((window as any).electron) {
      (window as any).electron.closeDevTools();
    }
  });
});

test.afterAll(async () => {
  await electronApp.close();
});

test.describe('コア機能の動作確認', () => {
  test('初期画面が表示される', async () => {
    // セットアップ画面の要素が存在することを確認
    await expect(page.locator('text=UniVoice')).toBeVisible();
    await expect(page.locator('text=授業を選択')).toBeVisible();
    await expect(page.locator('button:has-text("セッション開始")')).toBeVisible();
  });
  
  test('セッションを開始できる', async () => {
    // 授業を選択
    await page.click('text=241015_機械学習基礎');
    
    // セッション開始ボタンをクリック
    await page.click('button:has-text("セッション開始")');
    
    // リアルタイム表示セクションが表示されることを確認
    await expect(page.locator('text=最新')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=現在')).toBeVisible();
    
    // 録音が開始されることを確認
    await expect(page.locator('text=録音中')).toBeVisible();
  });
  
  test('リアルタイム音声認識が表示される', async () => {
    // モック音声データを送信
    await page.evaluate(() => {
      if ((window as any).electron) {
        // テスト用の音声認識結果をシミュレート
        (window as any).electron.emit('current-original-update', {
          text: 'This is a test transcription',
          isFinal: false
        });
      }
    });
    
    // 音声認識結果が表示されることを確認
    await expect(page.locator('text=This is a test transcription')).toBeVisible();
  });
  
  test('リアルタイム翻訳が表示される', async () => {
    // モック翻訳データを送信
    await page.evaluate(() => {
      if ((window as any).electron) {
        // テスト用の翻訳結果をシミュレート
        (window as any).electron.emit('current-translation-update', 
          'これはテスト翻訳です'
        );
      }
    });
    
    // 翻訳結果が表示されることを確認
    await expect(page.locator('text=これはテスト翻訳です')).toBeVisible();
  });
  
  test('履歴に保存される', async () => {
    // 翻訳完了イベントを送信
    await page.evaluate(() => {
      if ((window as any).electron) {
        (window as any).electron.emit('translation-complete', {
          id: 'test-1',
          original: 'This is the first complete sentence.',
          japanese: 'これは最初の完全な文です。',
          timestamp: Date.now()
        });
      }
    });
    
    // 履歴セクションに表示されることを確認
    await expect(page.locator('text=This is the first complete sentence.')).toBeVisible();
    await expect(page.locator('text=これは最初の完全な文です。')).toBeVisible();
  });
  
  test('3行表示システムが機能する', async () => {
    // 複数の文を送信
    const sentences = [
      { id: 'test-2', original: 'Second sentence.', japanese: '2番目の文。' },
      { id: 'test-3', original: 'Third sentence.', japanese: '3番目の文。' },
      { id: 'test-4', original: 'Fourth sentence.', japanese: '4番目の文。' }
    ];
    
    for (const sentence of sentences) {
      await page.evaluate((s) => {
        if ((window as any).electron) {
          (window as any).electron.emit('translation-complete', {
            ...s,
            timestamp: Date.now()
          });
        }
      }, sentence);
      
      // 少し待つ
      await page.waitForTimeout(100);
    }
    
    // 最新3つの文が表示されていることを確認
    const displayedTexts = await page.locator('.realtime-section').allTextContents();
    expect(displayedTexts.join(' ')).toContain('Second sentence');
    expect(displayedTexts.join(' ')).toContain('Third sentence');
    expect(displayedTexts.join(' ')).toContain('Fourth sentence');
  });
});

test.describe('UI機能の動作確認', () => {
  test('セクションのリサイズができる', async () => {
    // リサイズハンドルを取得
    const resizeHandle = page.locator('.resize-handle').first();
    
    // 初期の高さを取得
    const historySection = page.locator('[data-section="history"]');
    const initialHeight = await historySection.evaluate(el => el.clientHeight);
    
    // リサイズハンドルをドラッグ
    await resizeHandle.hover();
    await page.mouse.down();
    await page.mouse.move(0, 50);
    await page.mouse.up();
    
    // 高さが変わったことを確認
    const newHeight = await historySection.evaluate(el => el.clientHeight);
    expect(newHeight).not.toBe(initialHeight);
  });
  
  test('一時停止/再開ができる', async () => {
    // 一時停止ボタンをクリック
    await page.click('button:has-text("一時停止")');
    
    // 状態が変わることを確認
    await expect(page.locator('text=一時停止中')).toBeVisible();
    
    // 再開ボタンをクリック
    await page.click('button:has-text("再開")');
    
    // 録音中に戻ることを確認
    await expect(page.locator('text=録音中')).toBeVisible();
  });
  
  test('履歴モーダルが開く', async () => {
    // 履歴セクションをクリック
    await page.click('[data-section="history"]');
    
    // モーダルが表示されることを確認
    await expect(page.locator('text=全文履歴')).toBeVisible();
    
    // 閉じるボタンで閉じる
    await page.click('button:has-text("閉じる")');
    await expect(page.locator('text=全文履歴')).not.toBeVisible();
  });
  
  test('キーボードショートカットが機能する', async () => {
    // Spaceキーで一時停止
    await page.keyboard.press('Space');
    await expect(page.locator('text=一時停止中')).toBeVisible();
    
    // もう一度Spaceキーで再開
    await page.keyboard.press('Space');
    await expect(page.locator('text=録音中')).toBeVisible();
  });
});

test.describe('エラーハンドリング', () => {
  test('APIエラーが適切に表示される', async () => {
    // エラーイベントを送信
    await page.evaluate(() => {
      if ((window as any).electron) {
        (window as any).electron.emit('pipeline:error', 
          'API接続に失敗しました'
        );
      }
    });
    
    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=API接続に失敗しました')).toBeVisible();
  });
  
  test('マイク権限エラーが表示される', async () => {
    // マイク権限を拒否した場合のシミュレート
    await page.evaluate(() => {
      // navigator.mediaDevices.getUserMediaをモック
      (window as any).navigator.mediaDevices.getUserMedia = async () => {
        throw new Error('Permission denied');
      };
    });
    
    // セッション開始を試みる
    await page.click('button:has-text("セッション開始")');
    
    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=マイクの権限を確認してください')).toBeVisible();
  });
});

test.describe('データの永続化', () => {
  test('セッション情報がLocalStorageに保存される', async () => {
    // LocalStorageの内容を確認
    const storageData = await page.evaluate(() => {
      return localStorage.getItem('lastSession');
    });
    
    expect(storageData).toBeTruthy();
    const parsed = JSON.parse(storageData!);
    expect(parsed.className).toBeTruthy();
    expect(parsed.historyEntries).toBeInstanceOf(Array);
  });
  
  test('設定が保存される', async () => {
    // 言語設定を確認
    const sourceLanguage = await page.evaluate(() => {
      return localStorage.getItem('sourceLanguage');
    });
    const targetLanguage = await page.evaluate(() => {
      return localStorage.getItem('targetLanguage');
    });
    
    expect(sourceLanguage).toBe('en');
    expect(targetLanguage).toBe('ja');
  });
});

test.describe('パフォーマンス', () => {
  test('初期表示が1秒以内', async () => {
    const startTime = Date.now();
    
    // ページをリロード
    await page.reload();
    
    // 初期画面が表示されるまで待つ
    await expect(page.locator('text=UniVoice')).toBeVisible();
    
    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(1000);
  });
  
  test('翻訳のfirst paintが1秒以内', async () => {
    // タイムスタンプ付きでイベントを送信
    const startTime = Date.now();
    
    await page.evaluate((start) => {
      if ((window as any).electron) {
        // 翻訳開始をシミュレート
        (window as any).electron.emit('current-translation-update', 'こ');
      }
    }, startTime);
    
    // 最初の文字が表示されるまでの時間を計測
    await expect(page.locator('text=こ')).toBeVisible();
    const firstPaintTime = Date.now() - startTime;
    
    expect(firstPaintTime).toBeLessThan(1000);
  });
});