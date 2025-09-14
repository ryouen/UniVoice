# UniVoice Window Architecture Skeleton

このスケルトンは以下を提供します:
- WindowRegistry: ウィンドウ生成・復元・永続化を一元管理
- BoundsStore: 役割ごとの境界を `userData/window-bounds.json` に保存
- Setup → Main 遷移: Setupウィンドウを再利用し、Mainの前回サイズを復元
- 履歴/要約: 独立ウィンドウ（リサイズ・移動可能、デフォルトで hide-on-close）

## ルート
- `#/setup` / `#/main` / `#/history` / `#/summary` をロードする想定です。

## Preload API
- `window.uv.setup.setDesiredBounds(w, h)`
- `window.uv.setup.enterMain()`
- `window.uv.windows.openHistory()` / `openSummary()` / `toggleHistory()` / `toggleSummary()`

## ビルド環境の調整
- `preload.js` の実出力パスに合わせ、`window-registry.ts` の `preload` パスを調整してください。
- `resolveUrl()` の `dist/index.html` の位置もプロジェクト構成に合わせてください。
