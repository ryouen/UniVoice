/**
 * useMemoManager Hook
 * メモ機能の状態管理を一元化するカスタムフック
 * 
 * 責務:
 * - メモリストの管理
 * - メモの追加・編集・削除
 * - 翻訳処理の管理
 * 
 * リファクタリング目的:
 * - UniVoice.tsxからメモ関連のロジックを分離
 * - 再利用性向上
 * - 関心の分離によるコードの整理
 */

import { useState, useCallback, useRef } from 'react';
import type { Memo } from '../presentation/components/UniVoice/modals/types';

interface UseMemoManagerReturn {
  // State
  memoList: Memo[];
  questionInputRef: React.RefObject<HTMLTextAreaElement>;
  
  // Actions
  saveAsMemo: () => Promise<void>;
  saveMemoEdit: (memoId: string) => void;
  clearMemoList: () => void;
  setMemoList: (memos: Memo[]) => void;
}

interface UseMemoManagerProps {
  targetLanguage: string;
  sourceLanguage: string;
  onUserTranslate?: ((text: string, sourceLang: string, targetLang: string) => Promise<string>) | undefined;
}

/**
 * メモ管理用カスタムフック
 * UniVoice.tsxのメモ関連ロジックを集約
 */
export const useMemoManager = ({
  targetLanguage,
  sourceLanguage,
  onUserTranslate
}: UseMemoManagerProps): UseMemoManagerReturn => {
  const [memoList, setMemoList] = useState<Memo[]>([]);
  const questionInputRef = useRef<HTMLTextAreaElement>(null);
  
  /**
   * ユーザー質問の翻訳生成
   * targetLanguage（通常は日本語）からsourceLanguage（通常は英語）へ翻訳
   * 
   * 注意: メモ機能では通常の音声認識とは逆方向の翻訳を行う
   * - 音声認識: source(英語講義) → target(日本語字幕)
   * - メモ機能: target(日本語質問) → source(英語翻訳)
   */
  const generateQuestionTranslation = useCallback(async (text: string): Promise<string> => {
    if (!onUserTranslate) {
      return text;
    }
    
    try {
      // 質問翻訳は日本語→英語が主な使用ケース
      const translatedText = await onUserTranslate(text, targetLanguage, sourceLanguage);
      return translatedText || text;
    } catch (error) {
      console.error('[useMemoManager] Translation error:', error);
      return text;
    }
  }, [onUserTranslate, targetLanguage, sourceLanguage]);
  
  /**
   * メモとして保存（翻訳付き）
   * 2024-12-09: ユーザー入力の質問・メモを翻訳して保存する機能
   */
  const saveAsMemo = useCallback(async (): Promise<void> => {
    const textarea = questionInputRef.current;
    const text = textarea?.value?.trim();
    
    if (!text) {
      alert('質問・メモを入力してください');
      return;
    }
    
    try {
      // 質問を翻訳（日本語→英語）
      const translatedText = await generateQuestionTranslation(text);
      
      // メモとして保存
      // ユーザー入力言語がtargetLanguageの場合、入力をtargetTextに、翻訳をsourceTextに保存
      const newMemo: Memo = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        targetText: text,           // ユーザー入力（通常は日本語）
        sourceText: translatedText  // 翻訳結果（通常は英語）
      };
      
      setMemoList(prev => [...prev, newMemo]);
      
      // 入力欄をクリア
      if (textarea) {
        textarea.value = '';
      }
      
      // 保存完了通知
      alert('メモを保存しました');
    } catch (error) {
      console.error('[useMemoManager] Failed to save memo:', error);
      
      // エラー時でも翻訳なしで保存
      const newMemo: Memo = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        targetText: text,                    // ユーザー入力
        sourceText: '[Translation failed]'   // 翻訳失敗
      };
      
      setMemoList(prev => [...prev, newMemo]);
      
      if (textarea) {
        textarea.value = '';
      }
      
      alert('メモを保存しました（翻訳エラー）');
    }
  }, [generateQuestionTranslation, targetLanguage]);
  
  /**
   * メモの編集保存
   * TODO: 実装未完了
   */
  const saveMemoEdit = useCallback((memoId: string): void => {
    console.log('[useMemoManager] Edit requested for memo:', memoId);
    // 実装予定：編集機能
    const memoToEdit = memoList.find(m => m.id === memoId);
    if (memoToEdit) {
      console.log('[useMemoManager] Memo to edit:', memoToEdit);
      // TODO: 編集モーダルを開く、編集内容を保存する等
    }
  }, [memoList]);
  
  /**
   * メモリストをクリア
   */
  const clearMemoList = useCallback((): void => {
    setMemoList([]);
  }, []);
  
  return {
    // State
    memoList,
    questionInputRef,
    
    // Actions
    saveAsMemo,
    saveMemoEdit,
    clearMemoList,
    setMemoList,
  };
};