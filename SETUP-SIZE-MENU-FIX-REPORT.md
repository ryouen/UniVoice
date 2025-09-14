# セットアップ画面サイズとメニュー挙動の修正レポート

日付: 2025-09-14
ステータス: 🔧 修正実施済み

## 🔍 問題の深層分析

### 1. セットアップ画面が狭すぎる問題

#### 根本原因
- **ResizeObserverがコンテンツサイズに基づいてウィンドウをリサイズ**
- SetupSection.tsxの`.background`要素（maxWidth: 500px）を測定
- WindowRegistry.fitSetupTo()がこの小さなサイズでウィンドウを設定

#### 設計上の問題
- コンテンツベースのウィンドウサイズ調整は予測不可能
- レスポンシブデザインとウィンドウ管理の責務が混在

### 2. メニューと設定バーの挙動問題
- リサイズイベントの過剰発生
- ResizeModeの複雑な状態管理

## ✅ 実施した修正

### 1. WindowRegistry.tsの修正

#### デフォルトサイズを縦長に変更
```typescript
case 'setup':
  return {
    width: 600,    // 縦長のレイアウトに適した幅
    height: 800,   // 十分な高さを確保
    resizable: false,
    center: true,
    title: 'UniVoice - Setup'
  };
```

#### 最小サイズ制約の追加
```typescript
fitSetupTo(width: number, height: number): void {
  // 最小サイズを適切に設定（縦長のレイアウトに合わせて調整）
  const MIN_WIDTH = 600;  // 縦長のレイアウトに適した幅
  const MIN_HEIGHT = 700; // 全てのコンテンツが見えるよう十分な高さを確保
  
  // 最小サイズを優先し、コンテンツサイズと比較して大きい方を採用
  const finalWidth = Math.max(MIN_WIDTH, Math.floor(maxWidth));
  const finalHeight = Math.max(MIN_HEIGHT, Math.floor(maxHeight));
}
```

### 2. SetupSection.tsxの修正

#### ResizeObserverの無効化
```typescript
// Setup画面の初期サイズ設定（ResizeObserverによる自動調整は廃止）
useEffect(() => {
  // 初回のみウィンドウサイズを設定（コンテンツに依存しない固定サイズ）
  // WindowRegistryのデフォルトサイズ（600x800）を使用
  windowClient.measureAndSetSetupSize();
  
  // ResizeObserverは削除 - コンテンツベースのリサイズは問題を引き起こすため
  // ウィンドウサイズは固定とし、コンテンツはその中でレイアウトされる
}, []);
```

## 🎯 設計原則

### 1. ウィンドウサイズの決定原則
- **固定サイズ優先**: コンテンツに依存しない予測可能なサイズ
- **最小サイズ保証**: ユーザビリティを損なわない最小限のサイズ
- **縦長レイアウト**: セットアップ画面の性質に適したアスペクト比

### 2. 責務の分離
- **WindowRegistry**: ウィンドウのライフサイクル管理
- **SetupSection**: コンテンツのレイアウト（ウィンドウサイズには干渉しない）

## 🚀 次のステップ

### メニュー挙動の調査と修正
1. UniVoice.tsxのリサイズモード管理を調査
2. デバウンス処理の強化
3. 状態管理の簡素化

### テスト項目
- [ ] セットアップ画面が600x800で表示される
- [ ] コンテンツが適切にレイアウトされる
- [ ] ウィンドウサイズが勝手に変更されない
- [ ] メニューの表示/非表示が正常に動作する

## 📝 学習事項

1. **ResizeObserverの罠**: DOM要素のサイズ変更監視は便利だが、ウィンドウ管理には不適切
2. **固定サイズの重要性**: 予測可能な動作のために、ウィンドウサイズは明示的に管理すべき
3. **レイアウトの原則**: コンテンツはウィンドウに合わせる、ウィンドウをコンテンツに合わせない