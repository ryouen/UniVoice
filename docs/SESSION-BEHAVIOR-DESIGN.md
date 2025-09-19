# セッション動作設計書：再開 vs 新規作成

## 作成日: 2025-09-16
## 作成者: Claude Code (Senior Engineer Mode)

---

## 1. 現状の問題点

### 現在の動作
```
[アプリ起動] → [activeSessionあり？] 
                    ↓Yes              ↓No
              [自動的にメイン画面]    [Setup画面]
```

### 問題点
1. **ユーザーの意図が反映されない**
   - 前回のセッションが自動的に再開される
   - 新しいクラスを始めたい場合でも、前のセッションが表示される

2. **異常終了への対処がない**
   - ブラウザクラッシュ、強制終了などでセッションが残存
   - 次回起動時に不完全なセッションが復元される

3. **セッションの状態が不明**
   - いつ始まったセッションか
   - 正常に録音中だったか
   - 終了処理が完了したか

---

## 2. あるべき姿の定義

### 理想的な動作フロー
```
[アプリ起動] → [前回のセッション確認]
                    ↓
              [Setup画面（拡張版）]
                    ↓
        ┌──────────┴──────────┐
        │                      │
  [前回の続きから]         [新規セッション]
        │                      │
  [セッション復元]         [新規作成]
```

### セッション状態の定義
```typescript
interface SessionState {
  status: 'recording' | 'paused' | 'ended' | 'crashed';
  startedAt: number;
  lastActivityAt: number;
  className: string;
  sourceLanguage: string;
  targetLanguage: string;
  recordingDuration: number;  // 秒数
  segmentCount: number;       // 録音済みセグメント数
}
```

---

## 3. 詳細な実装計画

### Phase 1: セッション状態管理の強化（1-2日）

#### 1.1 SessionStateの拡張
```typescript
// 現在
interface SessionData {
  className: string;
  sourceLanguage: string;
  targetLanguage: string;
}

// 拡張後
interface EnhancedSessionData extends SessionData {
  status: SessionStatus;
  startedAt: number;
  lastActivityAt: number;
  recordingDuration: number;
  segmentCount: number;
  isRecoverable: boolean;  // 再開可能かどうか
}
```

#### 1.2 セッション有効性チェック
```typescript
const isSessionValid = (session: EnhancedSessionData): boolean => {
  const now = Date.now();
  const age = now - session.lastActivityAt;
  
  // 24時間以上前のセッションは無効
  if (age > 24 * 60 * 60 * 1000) return false;
  
  // クラッシュしたセッションは要確認
  if (session.status === 'crashed') return session.isRecoverable;
  
  // 終了済みセッションは無効
  if (session.status === 'ended') return false;
  
  return true;
};
```

### Phase 2: Setup画面の拡張（2-3日）

#### 2.1 セッション選択UI
```tsx
<SetupSection>
  {previousSession && isSessionValid(previousSession) && (
    <SessionResumeCard>
      <h3>前回のセッション</h3>
      <p>クラス: {previousSession.className}</p>
      <p>録音時間: {formatDuration(previousSession.recordingDuration)}</p>
      <p>セグメント数: {previousSession.segmentCount}</p>
      <div>
        <button onClick={resumeSession}>続きから録音</button>
        <button onClick={startNewSession}>新規セッション</button>
      </div>
    </SessionResumeCard>
  )}
  
  {/* 既存のSetup画面 */}
</SetupSection>
```

#### 2.2 セッション復元ロジック
```typescript
const resumeSession = async (session: EnhancedSessionData) => {
  // 1. セッションデータを復元
  setActiveSession({
    className: session.className,
    sourceLanguage: session.sourceLanguage,
    targetLanguage: session.targetLanguage
  });
  
  // 2. 録音済みデータを復元
  await dataPersistenceService.restoreSession(session.startedAt);
  
  // 3. UIを更新
  setRecordingTime(session.recordingDuration);
  setShowSetup(false);
  
  // 4. パイプライン再開
  await pipeline.resume();
};
```

### Phase 3: 異常終了対策（1-2日）

#### 3.1 定期的な状態保存
```typescript
// 30秒ごとにセッション状態を更新
useEffect(() => {
  if (!activeSession || !isRunning) return;
  
  const interval = setInterval(() => {
    sessionStorageService.updateSessionStatus({
      status: 'recording',
      lastActivityAt: Date.now(),
      recordingDuration: recordingTime,
      segmentCount: pipeline.history.length
    });
  }, 30000);
  
  return () => clearInterval(interval);
}, [activeSession, isRunning, recordingTime]);
```

#### 3.2 beforeunloadイベント
```typescript
useEffect(() => {
  const handleBeforeUnload = () => {
    if (activeSession && isRunning) {
      // セッションをクラッシュ状態に
      sessionStorageService.updateSessionStatus({
        status: 'crashed',
        lastActivityAt: Date.now()
      });
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [activeSession, isRunning]);
```

### Phase 4: データ永続化の改善（2-3日）

#### 4.1 セッションメタデータ管理
```typescript
class SessionMetadataService {
  private readonly METADATA_KEY = 'univoice-session-metadata';
  
  saveMetadata(sessionId: string, metadata: SessionMetadata): void {
    const all = this.getAllMetadata();
    all[sessionId] = metadata;
    localStorage.setItem(this.METADATA_KEY, JSON.stringify(all));
  }
  
  getLatestSession(): SessionMetadata | null {
    const all = this.getAllMetadata();
    const sessions = Object.values(all);
    
    // 最新のセッションを返す
    return sessions.sort((a, b) => b.lastActivityAt - a.lastActivityAt)[0] || null;
  }
  
  cleanupOldSessions(): void {
    const all = this.getAllMetadata();
    const now = Date.now();
    
    Object.entries(all).forEach(([id, session]) => {
      if (now - session.lastActivityAt > 7 * 24 * 60 * 60 * 1000) {
        delete all[id];
      }
    });
    
    localStorage.setItem(this.METADATA_KEY, JSON.stringify(all));
  }
}
```

---

## 4. 実装優先順位

### 優先度：高
1. **beforeunloadイベントハンドラー** - 即座に実装可能、影響大
2. **セッション有効期限チェック** - シンプル、効果的
3. **Setup画面でのセッション情報表示** - UX改善

### 優先度：中
4. **セッション復元機能** - 複雑だが価値高い
5. **定期的な状態保存** - 安全性向上

### 優先度：低
6. **完全なセッションメタデータ管理** - 将来的な拡張

---

## 5. テストシナリオ

### シナリオ1: 正常なセッション終了
1. セッション開始 → 録音 → 終了ボタン
2. アプリ再起動 → Setup画面が表示される ✓

### シナリオ2: ブラウザタブを閉じる
1. セッション開始 → 録音中 → タブを閉じる
2. アプリ再起動 → 「前回のセッション」が表示される ✓
3. 「続きから」選択 → セッション復元 ✓

### シナリオ3: 24時間経過
1. セッション開始 → 録音中 → 放置
2. 24時間後にアプリ起動 → Setup画面（セッション無効）✓

### シナリオ4: 新規セッション選択
1. 前回のセッションあり
2. アプリ起動 → 「新規セッション」選択
3. 前回のデータは保存済み、新規開始 ✓

---

## 6. リスクと対策

### リスク1: データ競合
- 対策: セッションIDによる一意性確保

### リスク2: ストレージ容量
- 対策: 7日以上前のメタデータ自動削除

### リスク3: 復元失敗
- 対策: try-catchでエラーハンドリング、フォールバック

---

## 7. 成功基準

1. ✅ ユーザーが「再開」か「新規」を選択できる
2. ✅ 異常終了してもデータが失われない
3. ✅ 古いセッションが自動的にクリーンアップされる
4. ✅ セッションの状態が明確に表示される
5. ✅ 既存の録音機能に影響しない