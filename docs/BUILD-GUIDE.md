# UniVoice ビルドガイド

## ビルドが必要な場合・不要な場合

### 🔨 ビルドが必要な場合

1. **Electronバックエンドのコード変更時**
   ```
   electron/
   ├── main.ts
   ├── preload.ts
   └── services/
       ├── domain/
       │   ├── UnifiedPipelineService.ts
       │   ├── TranslationQueueManager.ts
       │   └── DataPersistenceService.ts
       └── ipc/
           └── gateway.ts
   ```
   
   コマンド：
   ```bash
   npm run build:electron
   ```

2. **TypeScript型定義の変更時**
   - 新しい型やインターフェースの追加
   - 既存の型の変更
   - `.d.ts` ファイルの修正

3. **本番ビルド時**
   ```bash
   npm run build
   ```

### ✨ ビルドが不要な場合（ホットリロード）

1. **Reactフロントエンドのコード変更時**
   ```
   src/
   ├── components/
   │   └── UniVoice.tsx
   ├── hooks/
   │   └── useUnifiedPipeline.ts
   ├── utils/
   │   └── TranslationTimeoutManager.ts
   └── domain/
       └── services/
           └── RealtimeDisplayService.ts
   ```
   
   Viteが自動的に変更を検知してブラウザをリロード

2. **CSS/スタイルの変更時**
   - インラインスタイル
   - CSSファイル
   - Tailwind設定

## 開発フロー

### 1. 初回起動
```bash
# 依存関係インストール
npm install

# Electronコードのビルド
npm run build:electron

# 開発サーバー起動
npm run dev

# 別ターミナルでElectron起動
npm run electron
```

### 2. コード変更時

#### Electronコード変更後
```bash
# ビルドして再起動
npm run build:electron
# Ctrl+C でElectronを終了
npm run electron
```

#### Reactコード変更後
- 保存するだけ！
- ブラウザが自動リロード
- Electronウィンドウで F5 キーでリロード

### 3. クリーン起動
```bash
# Windowsの場合
start-clean.bat

# または手動で
npm run build:electron
npm run dev
# 別ターミナルで
npm run electron
```

## トラブルシューティング

### "Error launching app" が表示される場合
1. プロセスが残っている可能性
   ```bash
   # タスクマネージャーでelectron.exeを終了
   # または
   taskkill /IM electron.exe /F
   ```

2. ビルドエラーの確認
   ```bash
   npm run typecheck
   ```

3. ログの確認
   - DevTools (F12) のConsoleタブ
   - ターミナルのエラーメッセージ

### ホットリロードが効かない場合
1. Viteサーバーが起動しているか確認
2. http://localhost:5173/ にアクセスできるか確認
3. Electronウィンドウで手動リロード (F5)

---

最終更新: 2025-08-24
作成者: Claude Code