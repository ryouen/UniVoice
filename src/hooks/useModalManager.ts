/**
 * useModalManager Hook
 * モーダルの状態管理を一元化するカスタムフック
 * 
 * 責務:
 * - モーダルの開閉状態管理
 * - モーダルコンテンツの管理
 * - モーダル関連のロジック集約
 * 
 * リファクタリング目的:
 * - UniVoice.tsxからモーダル関連のstateを分離
 * - モーダル管理の再利用性向上
 * - 関心の分離によるコードの整理
 */

import { useState, useCallback } from 'react';

interface ModalManagerState {
  // FullscreenModal
  showFullscreenModal: boolean;
  modalTitle: string;
  modalContent: string;
  
  // MemoModal
  showMemoModal: boolean;
  
  // ReportModal
  showReportModal: boolean;
}

interface ModalManagerActions {
  // FullscreenModal actions
  openFullscreenModal: (title: string, content: string) => void;
  closeFullscreenModal: () => void;
  
  // MemoModal actions
  openMemoModal: () => void;
  closeMemoModal: () => void;
  
  // ReportModal actions
  openReportModal: () => void;
  closeReportModal: () => void;
}

export interface UseModalManagerReturn extends ModalManagerState, ModalManagerActions {}

/**
 * モーダル管理用カスタムフック
 * UniVoice.tsxのモーダル関連stateを集約
 */
export const useModalManager = (): UseModalManagerReturn => {
  // FullscreenModal state
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  
  // MemoModal state
  const [showMemoModal, setShowMemoModal] = useState(false);
  
  // ReportModal state
  const [showReportModal, setShowReportModal] = useState(false);
  
  // FullscreenModal actions
  const openFullscreenModal = useCallback((title: string, content: string) => {
    setModalTitle(title);
    setModalContent(content);
    setShowFullscreenModal(true);
  }, []);
  
  const closeFullscreenModal = useCallback(() => {
    setShowFullscreenModal(false);
    // オプション: モーダルを閉じる際にコンテンツをクリア
    // setModalTitle('');
    // setModalContent('');
  }, []);
  
  // MemoModal actions
  const openMemoModal = useCallback(() => {
    setShowMemoModal(true);
  }, []);
  
  const closeMemoModal = useCallback(() => {
    setShowMemoModal(false);
  }, []);
  
  // ReportModal actions
  const openReportModal = useCallback(() => {
    setShowReportModal(true);
  }, []);
  
  const closeReportModal = useCallback(() => {
    setShowReportModal(false);
  }, []);
  
  return {
    // State
    showFullscreenModal,
    modalTitle,
    modalContent,
    showMemoModal,
    showReportModal,
    
    // Actions
    openFullscreenModal,
    closeFullscreenModal,
    openMemoModal,
    closeMemoModal,
    openReportModal,
    closeReportModal,
  };
};