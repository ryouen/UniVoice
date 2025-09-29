# ウィンドウリサイズ問題の修正まとめ

## 作成日: 2025-09-16
## 作成者: Claude Code

---

## 概要

ユーザーから報告されたウィンドウリサイズ問題（374px問題、セクショントグル時のリサイズ、Setup→Main画面遷移の不具合）に対する構造的な分析と修正を実施しました。

---

## 実施した修正

### 1. BoundsStore.ts - Setup画面データの強制削除（374px問題の修正）

**修正箇所**: `electron/main/BoundsStore.ts` (88-93行目)

```typescript
// setup画面のデータは強制削除（374px問題の修正）
if (parsed.windows && parsed.windows.setup) {
  console.log('[BoundsStore] Removing invalid setup window data:', parsed.windows.setup);
  delete parsed.windows.setup;
}
```

**理由**: window-bounds.jsonに誤って保存されたsetup画面の異常な高さ（291px）が原因で、次回起動時に374pxの高さで表示される問題を解決。

### 2. WindowRegistry.ts - Setup画面の固定サイズ強制

**修正箇所**: `electron/main/WindowRegistry.ts` (99-108行目)

```typescript
} else {
  // setup画面は常に固定サイズを強制（374px問題の修正）
  window.setMinimumSize(600, 700);
  window.setMaximumSize(600, 800);
  window.setBounds({ 
    width: 600, 
    height: 800,
    x: Math.round((screen.getPrimaryDisplay().workArea.width - 600) / 2),
    y: Math.round((screen.getPrimaryDisplay().workArea.height - 800) / 2)
  });
  console.log('[WindowRegistry] Setup window size enforced: 600x800');
}
```

**理由**: Setup画面のサイズを確実に600x800に固定し、リサイズを防止。

### 3. CSS修正 - min-height: 100vh削除

**修正箇所**: `src/components/UniVoice.module.css` (71-86行目)

```css
/* App Container - Consolidated definition */
.app {
  --font-scale: 1; /* デフォルトのフォントスケール */
  font-size: calc(16px * var(--font-scale));
  line-height: 1.5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  position: relative;
  width: 100%;
  height: auto;
  display: flex;
  flex-direction: column;
  border-radius: 12px; /* 四隅の角丸 */
  overflow: hidden; /* 角丸の内側に収める */
  /* Removed min-height: 100vh to prevent window resize issues */
}
```

**理由**: 
- `min-height: 100vh`がセクショントグル時にウィンドウサイズを変更していた
- デスクトップアプリケーションではビューポート単位は不適切
- 重複する`.app`クラス定義も統合

### 4. Setup画面のビューポート単位修正

**修正箇所**: `src/components/UniVoice.tsx` (1949-1955行目)

```typescript
style={{
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',    // 100vw → 100%
  height: '100%'    // 100vh → 100%
}}
```

**理由**: ビューポート単位（vw/vh）はElectronアプリで予期しない動作を引き起こす可能性があるため、パーセント単位に変更。

---

## 問題の根本原因

### 1. **374px問題**
- WindowRegistryの設計ではsetup画面のboundsは保存しないはずが、実際には保存されていた
- window-bounds.jsonに異常な高さ（291px）が記録され、次回起動時に適用されていた

### 2. **セクショントグル時のリサイズ**
- CSSの`min-height: 100vh`が原因でコンテンツの高さ変更時にウィンドウ全体がリサイズされていた
- autoResize APIは既に無効化されていたため、問題はCSS側にあった

### 3. **Setup→Main画面遷移の不具合**
- ビューポート単位の使用とウィンドウサイズ管理の不整合が原因

---

## 今後の推奨事項

### 短期的
- window-bounds.jsonのマイグレーション処理を追加（既存ユーザー向け）
- ウィンドウサイズ変更のデバッグログを充実させる

### 長期的
- ウィンドウ管理をより明確に分離（Setup/Main/History/Summary）
- リアルタイムエリアのサイズを固定し、他のセクションはその外側で伸縮するアーキテクチャへ
- ResizeModeの概念を廃止し、よりシンプルなルールベースの管理へ

---

## 検証方法

1. 既存のwindow-bounds.jsonを削除して起動
2. Setup画面が600x800で表示されることを確認
3. セッション開始後、設定・質問セクションをトグルしてもウィンドウサイズが変わらないことを確認
4. Ctrl+Rでリロードしても正しいサイズが維持されることを確認

---

最終更新: 2025-09-16