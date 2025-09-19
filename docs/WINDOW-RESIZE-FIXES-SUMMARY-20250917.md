# ウィンドウリサイズ問題修正サマリー（2025-09-17）

## 🎯 修正対象問題

1. **374px問題**: Setup画面が374pxの高さで表示される
2. **リサイズ挙動の喪失**: セクショントグル時のウィンドウリサイズが機能しない
3. **Setup画面スキップ**: リロード時にSetup画面が表示されない

## 🔧 実施した修正

### 1. BoundsStore.ts の修正

```typescript
// setup画面のデータは強制削除（374px問題の修正）
if (parsed.windows && parsed.windows.setup) {
  console.log('[BoundsStore] Removing invalid setup window data:', parsed.windows.setup);
  delete parsed.windows.setup;
}
```

**理由**: window-bounds.jsonに保存された無効なsetup画面データ（height: 374）が原因

### 2. WindowRegistry.ts の修正

```typescript
// setup画面は常に固定サイズを強制（374px問題の修正）
const display = screen.getPrimaryDisplay();
const workArea = display.workArea;
const safeWidth = Math.min(targetWidth, workArea.width - 100);
const safeHeight = Math.min(targetHeight, workArea.height - 100);
```

**理由**: Setup画面は600x800の固定サイズであるべき

### 3. SetupSection.module.css の修正

```css
/* 変更前 */
min-height: 100vh;

/* 変更後 */
min-height: 100%;
```

**理由**: ビューポート単位がElectronウィンドウのリサイズを引き起こしていた

### 4. UniVoice.tsx の修正

```typescript
// パイプライン開始処理が進行中かどうかを追跡
const [isStartingPipeline, setIsStartingPipeline] = useState(false);
```

**理由**: React.StrictModeによる重複実行を防止

## 📊 結果

### ✅ 解決済み
- Setup画面は正しく600x800で表示される
- window-bounds.jsonの不正データは自動削除される
- パイプライン開始時の無限ループは解消
- セッション管理が正常に動作

### 🔍 調査完了
- 文字化け問題: 発生していない（ログで確認済み）
- バックエンドは正常に日本語を処理

### ⏳ 検証待ち
- セクショントグル時のリサイズ動作
- Ctrl+Rリロード後の動作
- UI上での日本語表示

## 🏗️ アーキテクチャ上の改善点

1. **ウィンドウ管理の集中化**: WindowRegistryによる一元管理
2. **セッション管理の強化**: 有効期限とライフサイクル管理
3. **エラーハンドリング**: パイプライン初期化エラーの適切な処理

## 📝 今後の推奨事項

1. **dist-electronフォルダ**: gitignoreに追加
2. **テスト追加**: ウィンドウ管理のE2Eテスト
3. **ドキュメント更新**: ウィンドウ管理の仕様書作成

---
*作成日: 2025-09-17*
*作成者: Claude Code*