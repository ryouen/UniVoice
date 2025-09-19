# ウィンドウリサイズ実装完了 (2025-09-19)

## 実装内容

### 1. Layout定数とCSS不整合の修正
- **問題**: layout.constants.tsが間違った値（header:200px, settingsBar:100px）を持っていた
- **実際のCSS値**: header:60px, settingsBar:56px
- **影響**: 184pxの計算誤差が発生していた
- **解決**: layout.constants.tsを正しい値に修正

### 2. リアルタイムエリア固定位置動作
- セクション切り替え時にリアルタイムエリアの画面位置（Y座標）を固定
- ヘッダー/設定バー切り替え：リアルタイムエリアの高さのみ調整
- 質問セクション切り替え：ウィンドウ全体をリサイズ
- ユーザーの視線移動を最小化

### 3. ボトムリサイズハンドル実装
- **新規フック**: src/hooks/useBottomResize.ts
- Clean Architecture準拠の設計
- フレームレスウィンドウの下端ドラッグサポート
- リアルタイムエリアのみリサイズ（質問セクション影響なし）
- 最小高さ200px、最大高さ制限なし
- LocalStorageへの自動保存

## 技術的詳細
- requestAnimationFrameによる60FPSスムーズ更新
- 5px閾値によるちらつき防止
- グローバルマウスイベント監視（ウィンドウ外追跡）
- テーマごとのリサイズハンドルスタイル対応

## 関連ファイル
- src/constants/layout.constants.ts（修正）
- src/hooks/useBottomResize.ts（新規）
- src/components/UniVoice.tsx（統合）
- src/components/UniVoice.module.css（スタイル追加）