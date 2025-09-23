/**
 * QuestionSection Component
 * 質問・メモ入力セクション
 * 
 * 機能:
 * - テキスト入力エリア
 * - メモ保存（翻訳付き）
 * - メモ一覧表示へのアクセス
 * 
 * Clean Architecture:
 * - 純粋なプレゼンテーション層
 * - ビジネスロジックはuseMemoManagerに委譲
 */

import React from 'react';
import styles from '../UniVoice.module.css';
import classNames from 'classnames';

interface QuestionSectionProps {
  isVisible: boolean;
  theme: 'light' | 'dark' | 'purple';
  questionInputRef: React.RefObject<HTMLTextAreaElement>;
  onSaveAsMemo: () => void;
  onOpenMemoModal: () => void;
  getThemeClass: (baseClass: string, skipThemePrefix?: boolean) => string;
}

export const QuestionSection: React.FC<QuestionSectionProps> = ({
  isVisible,
  theme,
  questionInputRef,
  onSaveAsMemo,
  onOpenMemoModal,
  getThemeClass
}) => {
  return (
    <div className={classNames(
      getThemeClass('questionArea'),
      isVisible ? styles.questionVisible : styles.questionHidden
    )} style={{
      height: isVisible ? '160px' : '0',
      overflow: isVisible ? 'visible' : 'hidden',
      transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      flexShrink: 0,
      WebkitAppRegion: 'no-drag'  // 入力エリアは操作可能にする
    }}>
      <div className={styles.questionInner} style={{
        padding: '20px 30px',
        display: 'flex',
        gap: '20px',
        height: '100%',
        borderTop: `1px solid ${theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}`
      }}>
        <textarea 
          ref={questionInputRef}
          className={getThemeClass('questionInput')}
          placeholder="質問・発言したい内容・メモを入力（日本語でOK）"
          style={{
            flex: 1,
            padding: '16px 20px',
            background: 'rgba(255, 255, 255, 0.9)',
            border: '2px solid rgba(102, 126, 234, 0.3)',
            borderRadius: '8px',
            fontSize: '15px',
            color: '#333',
            resize: 'none',
            height: '100%',
            boxSizing: 'border-box',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            outline: 'none'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.6)';
            e.currentTarget.style.background = 'white';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
          }}
        />
        <div className={styles.questionActions} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          justifyContent: 'center'
        }}>
          <button 
            className={classNames(
              styles.qBtnSecondary, 
              theme !== 'light' && styles[`theme${theme.charAt(0).toUpperCase() + theme.slice(1)}`]
            )}
            onClick={onOpenMemoModal}
            style={{
              padding: '10px 18px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              background: 'rgba(0, 0, 0, 0.05)',
              color: '#666'
            }}
          >
            メモ一覧
          </button>
          <button 
            className={styles.qBtnPrimary}
            onClick={onSaveAsMemo}
            style={{
              padding: '10px 18px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white'
            }}
          >
            英訳して保存
          </button>
        </div>
      </div>
    </div>
  );
};