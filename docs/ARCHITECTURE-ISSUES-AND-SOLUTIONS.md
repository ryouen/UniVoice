# アーキテクチャ課題と解決策

## 🎯 目的
Clean Architecture移行で発見された課題と、その解決策を記録する。

## 🔴 優先度：高

### 1. SetupSectionのLocalStorage直接アクセス

#### 現状の問題
```typescript
// SetupSection.tsx内
const getRecentClasses = (): string[] => {
  const stored = localStorage.getItem('recentClasses'); // ❌ インフラ層への直接依存
  // ...
};
```

#### 影響
- テストが困難（LocalStorageのモックが必要）
- 他の環境（React Native等）への移植が困難
- Clean Architectureの依存関係ルール違反

#### 解決策
```typescript
// 1. インターフェース定義（ドメイン層）
interface IClassRepository {
  getRecentClasses(): Promise<string[]>;
  saveRecentClasses(classes: string[]): Promise<void>;
}

// 2. 実装（インフラ層）
class LocalStorageClassRepository implements IClassRepository {
  async getRecentClasses(): Promise<string[]> {
    const stored = localStorage.getItem('recentClasses');
    return stored ? JSON.parse(stored) : [];
  }
  
  async saveRecentClasses(classes: string[]): Promise<void> {
    localStorage.setItem('recentClasses', JSON.stringify(classes));
  }
}

// 3. DIコンテナまたはContext経由で注入
<SetupSection 
  onStartSession={handleStartSession}
  classRepository={classRepository} // 注入
/>
```

### 2. ビジネスロジックのUI混在

#### 現状の問題
```typescript
// SetupSection.tsx内
const date = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // ❌ ビジネスロジック
const finalClassName = className.includes(date) ? className : `${date}_${className}`;
```

#### 影響
- ロジックの再利用が困難
- テストが複雑化
- 日付フォーマットの変更が困難

#### 解決策
```typescript
// 1. ドメインサービス
class ClassNameService {
  formatClassName(className: string, date: Date = new Date()): string {
    const datePrefix = this.formatDatePrefix(date);
    return className.includes(datePrefix) ? className : `${datePrefix}_${className}`;
  }
  
  private formatDatePrefix(date: Date): string {
    return date.toISOString().slice(2, 10).replace(/-/g, '');
  }
}

// 2. UIでの使用
const classNameService = useClassNameService(); // DIまたはHook
const finalClassName = classNameService.formatClassName(className);
```

## 🟡 優先度：中

### 3. イベント名の管理

#### 現状の問題
- events.tsを作成したが、まだ使用されていない箇所がある
- ハードコードされたイベント名が残存

#### 解決策
```typescript
// 全てのイベント名をevents.tsから使用
import { PIPELINE_EVENTS } from '@/shared/constants/events';

// 使用例
window.univoice.on(PIPELINE_EVENTS.TRANSLATION_COMPLETE, handler);
```

### 4. 音声レベル機能の未実装

#### 現状の問題
- RealtimeSectionは音声レベル表示の準備ができているが、データが来ない
- useUnifiedPipelineに音声レベル監視機能がない

#### 解決策
```typescript
// 1. 音声レベル監視サービス
class AudioLevelMonitor {
  private analyser: AnalyserNode;
  
  constructor(stream: MediaStream) {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    this.analyser = audioContext.createAnalyser();
    source.connect(this.analyser);
  }
  
  getLevel(): number {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    return average / 255; // 0-1に正規化
  }
}

// 2. useUnifiedPipelineへの統合
const [volumeLevel, setVolumeLevel] = useState(0);

useEffect(() => {
  if (!audioStream) return;
  
  const monitor = new AudioLevelMonitor(audioStream);
  const interval = setInterval(() => {
    setVolumeLevel(monitor.getLevel());
  }, 100);
  
  return () => clearInterval(interval);
}, [audioStream]);
```

## 🟢 優先度：低

### 5. コンソールログの整理

#### 現状の問題
- デバッグ用のconsole.logが本番コードに残存
- ログ名が統一されていない（UniVoicePerfect等）

#### 解決策
```typescript
// 1. 統一されたロガー
class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  debug(component: string, message: string, data?: any) {
    if (this.isDevelopment) {
      console.log(`[UniVoice.${component}]`, message, data);
    }
  }
}

// 2. 環境変数での制御
const logger = new Logger();
logger.debug('RealtimeSection', 'Rendering', { currentOriginal });
```

### 6. 型定義の重複と不整合

#### 現状の問題
- DisplayContent型がRealtimeSectionとThreeLineDisplayで重複定義
- 似たような型定義が複数箇所に存在

#### 解決策
```typescript
// shared/types/display.ts
export interface DisplayContent {
  oldest?: string;
  older?: string;
  recent?: string;
}

export interface DisplayState {
  original: DisplayContent;
  translation: DisplayContent;
}

// 各コンポーネントでインポート
import { DisplayContent, DisplayState } from '@/shared/types/display';
```

## 📊 改善による期待効果

### メンテナビリティ
- **現在**: 変更が複数ファイルに波及
- **改善後**: 単一責任により影響範囲が限定的

### テスタビリティ
- **現在**: モックが複雑、環境依存
- **改善後**: 依存性注入により簡単にテスト可能

### 拡張性
- **現在**: 新機能追加時に既存コードの変更が必要
- **改善後**: インターフェースに従って新実装を追加

### パフォーマンス
- **現在**: 大きなコンポーネントの再レンダリング
- **改善後**: 小さなコンポーネントで効率的な更新

## 🚀 実装優先順位

1. **Phase 1**: SetupSectionのリポジトリパターン適用
2. **Phase 2**: ビジネスロジックの分離
3. **Phase 3**: 音声レベル機能の実装
4. **Phase 4**: ロガーシステムの統一

---
最終更新: 2025-08-22
作成者: Claude (Ultrathink)