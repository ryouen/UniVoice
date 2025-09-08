/**
 * SetupSection - 改善版初期設定画面コンポーネント
 * 
 * 改善点:
 * - コンパクトリスト型UI（5行表示）
 * - 最新→3週間以内（古い順）→それ以降（新しい順）のソート
 * - ピン留め機能
 * - カスタムラベル編集機能
 * - 既存のセッションデータとの統合
 */

import React, { useState, useEffect, useRef } from 'react';
import { SessionResumeModal } from '../../modals';

// 全16言語設定（元ファイルと同じ）
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' }
];

// デフォルトラベル（ユーザーが編集可能）
const DEFAULT_LABELS = [
  '数学系',
  '工学系',
  '語学系',
  'ゼミ系',
  '理科系',
  '人文系'
];

interface CourseMetadata {
  id: string;
  name: string;
  lastUsed: Date;
  isPinned: boolean;
  labels: string[]; // 複数ラベル対応
  sessionCount?: number;
  sourceLanguage?: string;
  targetLanguage?: string;
}

export interface SetupSectionProps {
  onStartSession: (className: string, sourceLanguage: string, targetLanguage: string) => void;
  initialClassName?: string;
  defaultSourceLanguage?: string;
  defaultTargetLanguage?: string;
  style?: React.CSSProperties;
}

/**
 * 日付フォーマット関数
 */
const formatLastUsed = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  
  if (hours < 1) return '今';
  if (hours < 24) return `${hours}時間前`;
  if (days < 7) return `${days}日前`;
  if (weeks < 4) return `${weeks}週間前`;
  return `${Math.floor(days / 30)}ヶ月前`;
};

/**
 * 今日かどうか判定
 */
const isToday = (date: Date): boolean => {
  const now = new Date();
  return date.toDateString() === now.toDateString();
};

/**
 * コースのソート関数
 */
const sortCourses = (courses: CourseMetadata[]): CourseMetadata[] => {
  const now = new Date();
  const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
  
  return [...courses].sort((a, b) => {
    // 1. ピン留め優先
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    
    // 2. 両方ピン留めなら、最新順
    if (a.isPinned && b.isPinned) {
      return b.lastUsed.getTime() - a.lastUsed.getTime();
    }
    
    // 3. 最新の授業を最上位に
    if (isToday(a.lastUsed) && !isToday(b.lastUsed)) return -1;
    if (!isToday(a.lastUsed) && isToday(b.lastUsed)) return 1;
    
    // 4. 3週間以内は古い順
    const aWithin3Weeks = a.lastUsed >= threeWeeksAgo && !isToday(a.lastUsed);
    const bWithin3Weeks = b.lastUsed >= threeWeeksAgo && !isToday(b.lastUsed);
    
    if (aWithin3Weeks && bWithin3Weeks) {
      return a.lastUsed.getTime() - b.lastUsed.getTime(); // 古い順
    }
    
    if (aWithin3Weeks && !bWithin3Weeks) return -1;
    if (!aWithin3Weeks && bWithin3Weeks) return 1;
    
    // 5. 3週間以前は新しい順
    return b.lastUsed.getTime() - a.lastUsed.getTime();
  });
};

/**
 * 既存のrecentClassesからCourseMetadataへ変換
 */
const convertRecentClassesToCourses = (recentClasses: string[]): CourseMetadata[] => {
  const coursesMap = new Map<string, CourseMetadata>();
  
  recentClasses.forEach((className, index) => {
    // 日付プレフィックスを除去
    let cleanName = className;
    while (/^\d{6}_/.test(cleanName)) {
      cleanName = cleanName.replace(/^\d{6}_/, '');
    }
    
    if (!coursesMap.has(cleanName)) {
      coursesMap.set(cleanName, {
        id: `legacy_${index}_${Date.now()}`,
        name: cleanName,
        lastUsed: new Date(Date.now() - index * 24 * 60 * 60 * 1000), // 仮の日時
        isPinned: false,
        labels: [],
        sessionCount: 0
      });
    }
  });
  
  return Array.from(coursesMap.values());
};

/**
 * LocalStorageからコースメタデータを読み込み
 */
const loadCourseMetadata = (): CourseMetadata[] => {
  try {
    // 新形式のデータを確認
    const storedMetadata = localStorage.getItem('courseMetadata');
    if (storedMetadata) {
      const courses = JSON.parse(storedMetadata);
      return courses.map((c: any) => ({
        ...c,
        lastUsed: new Date(c.lastUsed)
      }));
    }
    
    // 旧形式（recentClasses）からの移行
    const storedClasses = localStorage.getItem('recentClasses');
    if (storedClasses) {
      const recentClasses = JSON.parse(storedClasses);
      const converted = convertRecentClassesToCourses(recentClasses);
      saveCourseMetadata(converted); // 新形式で保存
      return converted;
    }
  } catch (error) {
    console.error('Failed to load course metadata:', error);
  }
  
  return [];
};

/**
 * コースメタデータを保存
 */
const saveCourseMetadata = (courses: CourseMetadata[]): void => {
  try {
    localStorage.setItem('courseMetadata', JSON.stringify(courses));
    
    // 後方互換性のため、授業名リストも保存
    const classNames = courses.map(c => c.name);
    localStorage.setItem('recentClasses', JSON.stringify(classNames));
  } catch (error) {
    console.error('Failed to save course metadata:', error);
  }
};

/**
 * ラベルリストの管理
 */
const loadLabels = (): string[] => {
  try {
    const stored = localStorage.getItem('courseLabels');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load labels:', error);
  }
  return DEFAULT_LABELS;
};

const saveLabels = (labels: string[]): void => {
  try {
    localStorage.setItem('courseLabels', JSON.stringify(labels));
  } catch (error) {
    console.error('Failed to save labels:', error);
  }
};

export const SetupSection: React.FC<SetupSectionProps> = ({
  onStartSession,
  initialClassName = '',
  defaultSourceLanguage = 'en',
  defaultTargetLanguage = 'ja',
  style = {}
}) => {
  const [courses, setCourses] = useState<CourseMetadata[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<CourseMetadata[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [availableLabels, setAvailableLabels] = useState<string[]>([]);
  const [showNewCourseDialog, setShowNewCourseDialog] = useState(false);
  const [showLabelEditDialog, setShowLabelEditDialog] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseLabels, setNewCourseLabels] = useState<string[]>([]);
  const [sourceLanguage, setSourceLanguage] = useState(
    localStorage.getItem('sourceLanguage') || defaultSourceLanguage
  );
  const [targetLanguage, setTargetLanguage] = useState(
    localStorage.getItem('targetLanguage') || defaultTargetLanguage
  );
  const [showSessionResumeModal, setShowSessionResumeModal] = useState(false);
  const [checkingSession, setCheckingSession] = useState(false);
  const [todaySession, setTodaySession] = useState<{
    exists: boolean;
    sessionNumber?: number;
  }>({ exists: false });
  const listRef = useRef<HTMLDivElement>(null);
  
  // 初期化
  useEffect(() => {
    const loadData = async () => {
      // ラベルリストの読み込み
      const labels = loadLabels();
      setAvailableLabels(labels);
      
      // コースメタデータの読み込み
      let courseData = loadCourseMetadata();
      
      // Electronからセッションデータを取得して統合
      try {
        if (window.electron?.invoke) {
          const sessions = await window.electron.invoke('get-available-sessions', { limit: 100 });
          if (sessions && sessions.length > 0) {
            // セッションデータをコースメタデータに統合
            sessions.forEach((session: any) => {
              const existing = courseData.find(c => c.name === session.courseName);
              if (!existing) {
                courseData.push({
                  id: `session_${Date.now()}_${Math.random()}`,
                  name: session.courseName,
                  lastUsed: new Date(session.sessions?.[0]?.date || Date.now()),
                  isPinned: false,
                  labels: [],
                  sessionCount: session.sessions?.length || 0
                });
              } else if (existing.sessionCount !== undefined) {
                existing.sessionCount = session.sessions?.length || 0;
              }
            });
          }
        }
      } catch (error) {
        console.error('Failed to load sessions from electron:', error);
      }
      
      setCourses(courseData);
      
      // 初期選択
      const sorted = sortCourses(courseData);
      if (sorted.length > 0) {
        setSelectedCourse(sorted[0].id);
      }
    };
    
    loadData();
  }, []);
  
  // 言語設定の保存
  useEffect(() => {
    localStorage.setItem('sourceLanguage', sourceLanguage);
  }, [sourceLanguage]);
  
  useEffect(() => {
    localStorage.setItem('targetLanguage', targetLanguage);
  }, [targetLanguage]);
  
  // 当日セッション検出
  useEffect(() => {
    const checkTodaySession = async () => {
      const course = courses.find(c => c.id === selectedCourse);
      if (!course) return;
      
      setCheckingSession(true);
      try {
        if (window.electron?.invoke) {
          const result = await window.electron.invoke('check-today-session', course.name);
          setTodaySession(result || { exists: false });
        }
      } catch (error) {
        console.error('Failed to check today session:', error);
        setTodaySession({ exists: false });
      } finally {
        setCheckingSession(false);
      }
    };
    
    if (selectedCourse) {
      checkTodaySession();
    }
  }, [selectedCourse, courses]);
  
  // フィルタリング処理
  useEffect(() => {
    let filtered = [...courses];
    
    // 検索フィルタ
    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // ラベルフィルタ
    if (selectedLabel) {
      filtered = filtered.filter(c => c.labels.includes(selectedLabel));
    }
    
    // ソート適用
    filtered = sortCourses(filtered);
    setFilteredCourses(filtered);
  }, [courses, searchQuery, selectedLabel]);
  
  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !showNewCourseDialog && !showLabelEditDialog) {
        e.preventDefault();
        handleStartSession();
      }
      
      // 上下キーでの選択
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !showNewCourseDialog && !showLabelEditDialog) {
        e.preventDefault();
        const currentIndex = filteredCourses.findIndex(c => c.id === selectedCourse);
        let newIndex = currentIndex;
        
        if (e.key === 'ArrowDown') {
          newIndex = Math.min(currentIndex + 1, filteredCourses.length - 1);
        } else {
          newIndex = Math.max(currentIndex - 1, 0);
        }
        
        if (newIndex !== currentIndex && filteredCourses[newIndex]) {
          setSelectedCourse(filteredCourses[newIndex].id);
          
          // スクロール調整
          if (listRef.current) {
            const itemHeight = 36;
            const scrollTop = newIndex * itemHeight;
            const scrollBottom = (newIndex + 1) * itemHeight;
            const viewportHeight = listRef.current.clientHeight;
            
            if (scrollBottom > listRef.current.scrollTop + viewportHeight) {
              listRef.current.scrollTop = scrollBottom - viewportHeight;
            } else if (scrollTop < listRef.current.scrollTop) {
              listRef.current.scrollTop = scrollTop;
            }
          }
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCourse, filteredCourses, showNewCourseDialog, showLabelEditDialog]);
  
  // セッション開始処理
  const handleStartSession = () => {
    const course = courses.find(c => c.id === selectedCourse);
    if (!course) return;
    
    // 最終使用日時を更新
    const updatedCourses = courses.map(c => 
      c.id === selectedCourse 
        ? { ...c, lastUsed: new Date() }
        : c
    );
    setCourses(updatedCourses);
    saveCourseMetadata(updatedCourses);
    
    onStartSession(course.name, sourceLanguage, targetLanguage);
  };
  
  // ピン留め切り替え
  const togglePin = (courseId: string) => {
    const updatedCourses = courses.map(c => 
      c.id === courseId 
        ? { ...c, isPinned: !c.isPinned }
        : c
    );
    setCourses(updatedCourses);
    saveCourseMetadata(updatedCourses);
  };
  
  // ラベル編集
  const editCourseLabels = (courseId: string) => {
    setEditingCourseId(courseId);
    const course = courses.find(c => c.id === courseId);
    if (course) {
      setNewCourseLabels(course.labels);
    }
    setShowLabelEditDialog(true);
  };
  
  // ラベル保存
  const saveCourseLabels = () => {
    if (!editingCourseId) return;
    
    const updatedCourses = courses.map(c => 
      c.id === editingCourseId 
        ? { ...c, labels: newCourseLabels }
        : c
    );
    setCourses(updatedCourses);
    saveCourseMetadata(updatedCourses);
    setShowLabelEditDialog(false);
    setEditingCourseId(null);
    setNewCourseLabels([]);
  };
  
  // 新規授業追加
  const addNewCourse = () => {
    if (!newCourseName.trim()) return;
    
    const newCourse: CourseMetadata = {
      id: Date.now().toString(),
      name: newCourseName.trim(),
      lastUsed: new Date(),
      isPinned: false,
      labels: newCourseLabels,
      sessionCount: 0
    };
    
    const updatedCourses = [newCourse, ...courses];
    setCourses(updatedCourses);
    saveCourseMetadata(updatedCourses);
    setSelectedCourse(newCourse.id);
    setNewCourseName('');
    setNewCourseLabels([]);
    setShowNewCourseDialog(false);
  };
  
  // 新しいラベルを追加
  const addNewLabel = (label: string) => {
    if (label && !availableLabels.includes(label)) {
      const updated = [...availableLabels, label];
      setAvailableLabels(updated);
      saveLabels(updated);
    }
  };
  
  // セッション選択からの再開処理
  const handleSelectSession = async (courseName: string, dateStr: string, sessionNumber: number) => {
    try {
      const sessionData = await window.electron.invoke('load-session', {
        courseName,
        dateStr,
        sessionNumber
      });
      
      if (sessionData) {
        setSourceLanguage(sessionData.metadata.sourceLanguage);
        setTargetLanguage(sessionData.metadata.targetLanguage);
        onStartSession(courseName, sessionData.metadata.sourceLanguage, sessionData.metadata.targetLanguage);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };
  
  return (
    <>
      <SessionResumeModal
        isOpen={showSessionResumeModal}
        onClose={() => setShowSessionResumeModal(false)}
        onSelectSession={handleSelectSession}
      />
      
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          width: '90%',
          maxWidth: '500px'
        }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 'bold',
            marginBottom: '30px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textAlign: 'center'
          }}>
            UniVoice
          </h1>
          
          {/* 授業選択セクション */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              color: '#666',
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              授業を選択:
            </label>
            
            {/* コースリスト */}
            <div 
              ref={listRef}
              style={{
                height: '180px',
                overflowY: 'auto',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                background: 'white'
              }}
            >
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => setSelectedCourse(course.id)}
                  style={{
                    height: '36px',
                    padding: '0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: selectedCourse === course.id ? '#f0f7ff' : 'transparent',
                    borderBottom: '1px solid #f0f0f0',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCourse !== course.id) {
                      e.currentTarget.style.background = '#f5f5f5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCourse !== course.id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {/* ラベル（左側） */}
                  <div style={{
                    marginRight: '8px',
                    display: 'flex',
                    gap: '4px'
                  }}>
                    {course.labels.map(label => (
                      <span
                        key={label}
                        style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: '#667eea20',
                          color: '#667eea',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {label}
                      </span>
                    ))}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        editCourseLabels(course.id);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        fontSize: '12px',
                        color: '#999'
                      }}
                    >
                      ✏️
                    </button>
                  </div>
                  
                  {/* 授業名（右側） */}
                  <span style={{ flex: 1, fontSize: '14px' }}>
                    {course.name}
                  </span>
                  
                  {/* ピン留めボタン */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(course.id);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      marginLeft: 'auto',
                      marginRight: '8px',
                      fontSize: '16px'
                    }}
                  >
                    {course.isPinned ? '📌' : '📍'}
                  </button>
                  
                  {/* 最終使用 */}
                  <span style={{
                    fontSize: '12px',
                    color: '#999'
                  }}>
                    {formatLastUsed(course.lastUsed)}
                  </span>
                </div>
              ))}
              
              {filteredCourses.length === 0 && (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#999',
                  fontSize: '14px'
                }}>
                  授業が見つかりません
                </div>
              )}
            </div>
          </div>
          
          {/* アクションボタン */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px'
          }}>
            <button
              onClick={() => setShowNewCourseDialog(true)}
              style={{
                padding: '8px 16px',
                background: 'white',
                color: '#667eea',
                border: '1px solid #667eea',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#667eea';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = '#667eea';
              }}
            >
              + 新規授業
            </button>
            
            <input
              type="text"
              placeholder="🔍 検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '13px'
              }}
            />
            
            <select
              value={selectedLabel || ''}
              onChange={(e) => setSelectedLabel(e.target.value || null)}
              style={{
                padding: '8px 12px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '13px',
                background: 'white'
              }}
            >
              <option value="">すべて</option>
              {availableLabels.map(label => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          
          {/* 言語設定 */}
          <div style={{
            padding: '16px',
            background: '#f8f9fa',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              fontSize: '14px'
            }}>
              <span style={{ color: '#666' }}>言語設定:</span>
              <select
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  background: 'white',
                  fontSize: '13px'
                }}
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName}
                  </option>
                ))}
              </select>
              
              <span style={{ color: '#999' }}>→</span>
              
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  background: 'white',
                  fontSize: '13px'
                }}
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName}
                  </option>
                ))}
              </select>
            </div>
            
            {sourceLanguage === targetLanguage && (
              <p style={{
                fontSize: '12px',
                color: '#ff6b6b',
                marginTop: '8px',
                marginBottom: 0
              }}>
                ⚠️ 授業の言語と母国語が同じです
              </p>
            )}
          </div>
          
          {/* 開始ボタン */}
          <button
            onClick={handleStartSession}
            disabled={!selectedCourse}
            style={{
              width: '100%',
              padding: '16px',
              background: todaySession.exists 
                ? 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)'
                : selectedCourse 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: selectedCourse ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s',
              opacity: checkingSession ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (selectedCourse) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = todaySession.exists
                  ? '0 10px 30px rgba(67, 206, 162, 0.3)'
                  : '0 10px 30px rgba(102, 126, 234, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {checkingSession ? '確認中...' :
             todaySession.exists ? `続きから再開（第${todaySession.sessionNumber}回）` :
             '開始 (Space)'}
          </button>
          
          <button
            onClick={() => setShowSessionResumeModal(true)}
            style={{
              width: '100%',
              marginTop: '8px',
              padding: '12px',
              background: 'transparent',
              color: '#667eea',
              border: '1px solid #667eea',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#667eea10';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            過去のセッションから選択
          </button>
        </div>
        
        {/* 新規授業追加ダイアログ */}
        {showNewCourseDialog && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '400px'
            }}>
              <h3 style={{ marginBottom: '16px' }}>新規授業を追加</h3>
              
              <input
                type="text"
                placeholder="授業名"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  marginBottom: '12px',
                  fontSize: '14px'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addNewCourse();
                  }
                }}
              />
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', color: '#666' }}>ラベル（複数選択可）:</label>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginTop: '8px'
                }}>
                  {availableLabels.map(label => (
                    <label
                      key={label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={newCourseLabels.includes(label)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewCourseLabels([...newCourseLabels, label]);
                          } else {
                            setNewCourseLabels(newCourseLabels.filter(l => l !== label));
                          }
                        }}
                        style={{ marginRight: '4px' }}
                      />
                      <span style={{ fontSize: '13px' }}>{label}</span>
                    </label>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="新しいラベルを追加..."
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    marginTop: '8px',
                    fontSize: '12px'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value) {
                      e.preventDefault();
                      const newLabel = e.currentTarget.value.trim();
                      addNewLabel(newLabel);
                      setNewCourseLabels([...newCourseLabels, newLabel]);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={addNewCourse}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  追加
                </button>
                <button
                  onClick={() => {
                    setShowNewCourseDialog(false);
                    setNewCourseName('');
                    setNewCourseLabels([]);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#f0f0f0',
                    color: '#666',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* ラベル編集ダイアログ */}
        {showLabelEditDialog && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '400px'
            }}>
              <h3 style={{ marginBottom: '16px' }}>ラベルを編集</h3>
              
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '16px'
              }}>
                {availableLabels.map(label => (
                  <label
                    key={label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={newCourseLabels.includes(label)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewCourseLabels([...newCourseLabels, label]);
                        } else {
                          setNewCourseLabels(newCourseLabels.filter(l => l !== label));
                        }
                      }}
                      style={{ marginRight: '4px' }}
                    />
                    <span style={{ fontSize: '13px' }}>{label}</span>
                  </label>
                ))}
              </div>
              
              <input
                type="text"
                placeholder="新しいラベルを追加..."
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  marginBottom: '16px',
                  fontSize: '12px'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    e.preventDefault();
                    const newLabel = e.currentTarget.value.trim();
                    addNewLabel(newLabel);
                    setNewCourseLabels([...newCourseLabels, newLabel]);
                    e.currentTarget.value = '';
                  }
                }}
              />
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={saveCourseLabels}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  保存
                </button>
                <button
                  onClick={() => {
                    setShowLabelEditDialog(false);
                    setEditingCourseId(null);
                    setNewCourseLabels([]);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#f0f0f0',
                    color: '#666',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};