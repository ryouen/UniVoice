/**
 * SessionResumeModal - セッション再開選択モーダル
 * 
 * 過去のセッション一覧を表示し、選択して再開できる機能を提供
 */

import React, { useState, useEffect } from 'react';
import { BaseModalProps } from './types';

interface SessionInfo {
  courseName: string;
  sessionNumber: number;
  date: string; // YYMMDD
  startTime: string;
  endTime?: string;
  duration?: number;
  wordCount?: number;
}

interface CourseWithSessions {
  courseName: string;
  sessions: SessionInfo[];
}

interface SessionResumeModalProps extends BaseModalProps {
  onSelectSession: (courseName: string, date: string, sessionNumber: number) => void;
  currentCourseName?: string; // 現在選択中の授業名（フィルタリング用）
}

export const SessionResumeModal: React.FC<SessionResumeModalProps> = ({
  isOpen,
  onClose,
  onSelectSession,
  currentCourseName
}) => {
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<CourseWithSessions[]>([]);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [selectedSession, setSelectedSession] = useState<{ courseName: string; date: string; sessionNumber: number } | null>(null);

  // セッション一覧を取得
  useEffect(() => {
    if (isOpen) {
      loadAvailableSessions();
    }
  }, [isOpen, currentCourseName]);

  const loadAvailableSessions = async () => {
    setLoading(true);
    console.log('[SessionResumeModal] Loading available sessions...');
    console.log('[SessionResumeModal] window.electron:', window.electron);
    console.log('[SessionResumeModal] window.electron?.invoke:', window.electron?.invoke);
    
    try {
      if (window.electron?.invoke) {
        console.log('[SessionResumeModal] Invoking get-available-sessions with params:', {
          courseName: currentCourseName,
          limit: 50
        });
        
        const sessions = await window.electron.invoke('get-available-sessions', {
          courseName: currentCourseName,
          limit: 50
        });
        
        console.log('[SessionResumeModal] Received sessions:', sessions);
        console.log('[SessionResumeModal] Sessions count:', sessions?.length || 0);
        
        setCourses(sessions || []);
        
        // 現在の授業名があれば自動展開
        if (currentCourseName && sessions?.some((c: CourseWithSessions) => c.courseName === currentCourseName)) {
          setExpandedCourses(new Set([currentCourseName]));
        }
      } else {
        console.error('[SessionResumeModal] window.electron.invoke is not available!');
      }
    } catch (error) {
      console.error('[SessionResumeModal] Failed to load available sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCourse = (courseName: string) => {
    const newExpanded = new Set(expandedCourses);
    if (newExpanded.has(courseName)) {
      newExpanded.delete(courseName);
    } else {
      newExpanded.add(courseName);
    }
    setExpandedCourses(newExpanded);
  };

  const formatDate = (dateStr: string) => {
    // YYMMDD -> YY/MM/DD
    const year = dateStr.substring(0, 2);
    const month = dateStr.substring(2, 4);
    const day = dateStr.substring(4, 6);
    return `20${year}/${month}/${day}`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    }
    return `${minutes}分`;
  };

  const handleSessionSelect = (courseName: string, session: SessionInfo) => {
    setSelectedSession({
      courseName,
      date: session.date,
      sessionNumber: session.sessionNumber
    });
  };

  const handleResumeSession = () => {
    if (selectedSession) {
      onSelectSession(
        selectedSession.courseName,
        selectedSession.date,
        selectedSession.sessionNumber
      );
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col">
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">過去のセッションから選択</h2>
          <p className="text-sm text-gray-600 mt-1">
            過去のセッションを選択して続きから再開できます
          </p>
        </div>

        {/* ボディ */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="mt-2 text-gray-600">読み込み中...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">利用可能なセッションがありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {courses.map((course) => (
                <div key={course.courseName} className="border border-gray-200 rounded-lg">
                  {/* 授業名ヘッダー */}
                  <button
                    onClick={() => toggleCourse(course.courseName)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        className={`w-4 h-4 transform transition-transform ${
                          expandedCourses.has(course.courseName) ? 'rotate-90' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="font-medium text-gray-800">{course.courseName}</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {course.sessions.length}個のセッション
                    </span>
                  </button>

                  {/* セッション一覧 */}
                  {expandedCourses.has(course.courseName) && (
                    <div className="border-t border-gray-200">
                      {course.sessions.map((session) => {
                        const isSelected = selectedSession?.courseName === course.courseName &&
                                         selectedSession?.date === session.date &&
                                         selectedSession?.sessionNumber === session.sessionNumber;
                        
                        return (
                          <button
                            key={`${session.date}_${session.sessionNumber}`}
                            onClick={() => handleSessionSelect(course.courseName, session)}
                            className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                              isSelected ? 'bg-purple-50 border-l-4 border-purple-600' : ''
                            }`}
                          >
                            <div className="flex items-center gap-4 text-left">
                              <div className="text-sm text-gray-600 w-20">
                                第{session.sessionNumber}回
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-800">
                                  {formatDate(session.date)}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {formatDuration(session.duration)}
                                  {session.wordCount && ` • ${session.wordCount.toLocaleString()}語`}
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="text-purple-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleResumeSession}
            disabled={!selectedSession}
            className={`px-4 py-2 rounded-md transition-colors ${
              selectedSession
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            このセッションを再開
          </button>
        </div>
      </div>
    </div>
  );
};