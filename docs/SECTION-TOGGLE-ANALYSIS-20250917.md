# セクショントグル動作分析（2025-09-17）

## 📊 現状分析

### 発見した問題

`src/components/UniVoice.tsx`内で、セクション表示状態が変更されるたびに`executeWindowResize()`が呼ばれている：

```typescript
// Line 1007-1022
useEffect(() => {
  if (!activeSession) {
    return;
  }
  const delay = showQuestionSection !== undefined ? LAYOUT_HEIGHTS.animationDelay : 50;
  
  const timer = setTimeout(() => {
    executeWindowResize();  // ← これが原因でウィンドウがリサイズされる
  }, delay);
  
  return () => clearTimeout(timer);
}, [showSettings, showQuestionSection, showHeader, executeWindowResize, activeSession]);
```

### executeWindowResize()の動作

```typescript
// Line 955-986
const executeWindowResize = useCallback(async () => {
  setCurrentResizeMode(ResizeMode.SECTION_TOGGLE);
  
  const targetHeight = calculateTotalHeight();
  
  // ウィンドウリサイズをIPCで実行
  const windowAPI = window.univoice?.window;
  if (windowAPI?.autoResize) {
    await windowAPI.autoResize(targetHeight);  // ← 実際にウィンドウサイズを変更
  }
}, [calculateTotalHeight, ...]);
```

### calculateTotalHeight()の計算ロジック

```typescript
// Line 917-943
const calculateTotalHeight = useCallback(() => {
  let totalHeight = 0;
  
  // ヘッダー
  if (showHeader) {
    totalHeight += LAYOUT_HEIGHTS.header;
  } else {
    totalHeight += LAYOUT_HEIGHTS.minimalControl;
  }
  
  // 設定バー
  if (showSettings) {
    totalHeight += LAYOUT_HEIGHTS.settingsBar;
  }
  
  // リアルタイムセクション
  totalHeight += realtimeSectionHeight;
  
  // 質問セクション
  if (showQuestionSection) {
    totalHeight += LAYOUT_HEIGHTS.questionSection;
  }
  
  return totalHeight;
}, [...]);
```

## 🎯 問題の本質

現在の実装は、セクションの表示/非表示に応じてウィンドウの高さを動的に調整する設計になっている。これは：

1. **意図的な仕様**: コンテンツに合わせてウィンドウサイズを最適化
2. **潜在的な問題**: ユーザーが手動でリサイズした後も、セクショントグルで元に戻ってしまう

## 💡 解決オプション

### オプション1: 自動リサイズを完全に無効化
- `executeWindowResize()`の呼び出しをコメントアウト
- ウィンドウサイズは固定、コンテンツはスクロール

### オプション2: 初回のみ自動リサイズ
- 最初の1回だけリサイズを実行
- その後はユーザーのリサイズを尊重

### オプション3: ユーザー設定で切り替え可能
- 自動リサイズのON/OFF設定を追加
- デフォルトはOFF

### オプション4: 最小・最大サイズ内での調整
- ウィンドウの最小・最大サイズを設定
- その範囲内でのみ自動調整

## 📝 推奨事項

**オプション2**（初回のみ自動リサイズ）が最もバランスが良いと考えられる：

1. 初期表示時は適切なサイズで表示
2. ユーザーがリサイズしたら、それを尊重
3. セクショントグルはコンテンツのみ変更（ウィンドウサイズは変更しない）

## 🔧 実装案

```typescript
// ユーザーがウィンドウをリサイズしたかどうかのフラグを追加
const [userHasResized, setUserHasResized] = useState(false);

// ウィンドウリサイズ検知
useEffect(() => {
  const handleWindowResize = () => {
    setUserHasResized(true);
  };
  
  window.addEventListener('resize', handleWindowResize);
  return () => window.removeEventListener('resize', handleWindowResize);
}, []);

// セクショントグル時のリサイズ制御
useEffect(() => {
  if (!activeSession || userHasResized) {
    return;  // ユーザーがリサイズ済みの場合はスキップ
  }
  // ... 既存のリサイズロジック
}, [showSettings, showQuestionSection, showHeader, userHasResized, ...]);
```