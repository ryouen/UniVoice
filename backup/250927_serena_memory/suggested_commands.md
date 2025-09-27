# UniVoice 2.0 開発コマンド集

## 開発環境の起動
```bash
# 環境変数設定（初回のみ）
copy .env.example .env

# 依存関係インストール
npm install

# 開発サーバー起動（Vite）
npm run dev

# Electronアプリ起動（別ターミナル）
npm run electron

# 同時起動（推奨）
npm start
```

## ビルド関連
```bash
# TypeScript型チェック
npm run typecheck

# 型定義同期（contracts.ts）
npm run sync-contracts

# プロダクションビルド
npm run build

# クリーンビルド
npm run clean && npm run build
```

## テスト実行
```bash
# 全テスト実行
npm test

# 単体テストのみ
npm run test:unit

# 統合テストのみ
npm run test:integration

# パフォーマンステスト
npm run test:performance

# E2Eテスト（Playwright）
npm run test:e2e
npm run test:e2e:ui  # UIモード
```

## デバッグ・ログ確認
```bash
# 最新ログ確認（PowerShell）
Get-Content logs\univoice-$(Get-Date -Format "yyyy-MM-dd").jsonl -Tail 50 -Wait

# エラーログのみ抽出
Select-String '"level":"error"' logs\univoice-*.jsonl

# プロセス確認
Get-Process | Where-Object {$_.Name -like "*electron*"}
```

## Git操作（Windows）
```bash
# 状態確認
git status

# 差分確認
git diff

# ステージング
git add .

# コミット
git commit -m "コメント"

# プッシュ
git push origin main
```

## Windows特有のコマンド
```bash
# ディレクトリ一覧
dir

# ファイル検索
dir /s /b *.ts

# テキスト検索
findstr /s /i "SearchText" *.ts

# 環境変数確認
echo %OPENAI_API_KEY%

# プロセス終了
taskkill /F /IM electron.exe
```

## クリーンアップ
```bash
# ビルド成果物削除
npm run clean

# node_modules再インストール
rmdir /s /q node_modules
npm install

# Electronキャッシュクリア
rmdir /s /q "%APPDATA%\univoice"
```

## トラブルシューティング
```bash
# TypeScriptビルドエラー時
npm run typecheck

# 型定義不整合時
npm run sync-contracts

# Electron起動失敗時
taskkill /F /IM electron.exe
npm run electron
```

## 重要な注意点
- 必ず`npm run typecheck`でビルドエラーがないことを確認
- コミット前に`npm run sync-contracts`で型定義を同期
- Setup画面で問題が発生したら`%APPDATA%\univoice`を削除