/**
 * UserInputSection Component
 * ユーザー入力セクション - 質問・メモの入力と処理
 * 
 * 機能:
 * - 日本語での質問入力
 * - 英訳生成
 * - メモの保存
 * - メモ一覧の表示
 * - セクションのリサイズ
 * 
 * Clean Architecture:
 * - UI層のみ（プレゼンテーション層）
 * - ビジネスロジックは親コンポーネントに委譲
 */

import React from 'react';

interface UserInputSectionProps {
  // セクション高さ制御
  height: number; // vh単位の高さ
  isExpanded: boolean;
  
  // メモ関連
  memoCount: number;
  
  // イベントハンドラー
  onExpandInput: (expand: boolean) => void;
  onSaveAsMemo: () => void;
  onShowMemoModal: () => void;
  onResize: (event: React.MouseEvent) => void;
  
  // 表示ステート
  showTranslating?: boolean; // 翻訳中表示
}

export const UserInputSection: React.FC<UserInputSectionProps> = ({
  height,
  isExpanded,
  memoCount,
  onExpandInput,
  onSaveAsMemo,
  onShowMemoModal,
  onResize,
  showTranslating = false
}) => {
  // セクションの高さスタイル計算
  const getSectionStyle = () => {
    let calculatedHeight = height;
    
    if (isExpanded) {
      calculatedHeight = 40; // 拡大時（入力フォーカス時）
    } else if (isExpanded === false) { // 他のセクションが拡大されている場合
      calculatedHeight = 10; // 圧縮時
    }
    
    return {
      height: `${calculatedHeight}vh`,
      transition: 'height 0.3s ease'
    };
  };

  const handleMemoButtonClick = () => {
    const textarea = document.getElementById('questionInput') as HTMLTextAreaElement;
    const text = textarea?.value;
    if (text?.trim()) {
      onSaveAsMemo();
    }
  };

  return (
    <div style={{
      ...getSectionStyle(),
      display: 'flex',
      background: 'white',
      borderTop: '2px solid #667eea',
      position: 'relative'
    }}>
      {/* リサイズハンドル */}
      <div 
        className="resize-handle"
        onMouseDown={onResize}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '4px',
          top: '-2px',
          background: 'transparent',
          cursor: 'ns-resize',
          zIndex: 10
        }}
      />
      
      {/* 左側：ガイドテキスト */}
      <div style={{ flex: 1, padding: '15px 20px' }}>
        <div style={{
          background: '#f0f9ff',
          padding: '15px',
          borderRadius: '8px',
          height: '100%',
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#0066cc',
          display: 'flex',
          alignItems: 'center'
        }}>
          <div>
            {showTranslating ? '翻訳中...' : '質問を入力してください'}
          </div>
        </div>
      </div>
      
      {/* 右側：入力エリア */}
      <div style={{ flex: 1, padding: '15px 20px', display: 'flex', gap: '10px' }}>
        <textarea
          id="questionInput"
          placeholder="質問・発言したい内容・メモ（日本語でOK）"
          onFocus={() => onExpandInput(true)}
          onBlur={() => onExpandInput(false)}
          defaultValue=""
          style={{
            flex: 1,
            padding: '12px',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '14px',
            resize: 'none'
          }}
        />
        
        {/* ボタングループ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* メモ一覧ボタン */}
          <button 
            onClick={onShowMemoModal} 
            style={{
              padding: '8px 16px',
              background: 'white',
              border: '1px solid #667eea',
              borderRadius: '6px',
              color: '#667eea',
              cursor: 'pointer',
              fontSize: '13px',
              whiteSpace: 'nowrap',
              position: 'relative'
            }}
          >
            📝 一覧
            {memoCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: '#ffd700',
                color: '#333',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '10px',
                fontWeight: 600
              }}>
                {memoCount}
              </span>
            )}
          </button>
          
          {/* メモ/英訳ボタン */}
          <button 
            onClick={handleMemoButtonClick} 
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              whiteSpace: 'nowrap'
            }}
          >
            メモ/英訳
          </button>
        </div>
      </div>
    </div>
  );
};