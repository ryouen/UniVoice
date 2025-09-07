# UniVoice 2.0 推奨コマンド集

## 開発環境セットアップ
```bash
# 環境変数設定（必須）
cp .env.example .env
# .envファイルを編集してAPIキーを設定

# 依存関係インストール
npm install

# 開発サーバー起動（2ターミナル必要）
npm run dev          # ターミナル1: Viteサーバー
npm run electron     # ターミナル2: Electronアプリ

# 1コマンドで両方起動
npm start
```

## ビルドとチェック
```bash
# TypeScript型チェック（必須）
npm run typecheck

# 本番ビルド（メモリ4GB必要）
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

# 特定のテストファイル実行
npx jest tests/unit/StreamCoalescer.test.ts

# 個別の重要なテスト
node tests/unit/test-display-segment-interim.js    # interim/final表示
node tests/unit/test-grouped-history.js            # グループ化履歴
node tests/unit/test-progressive-summary.js        # 段階的要約
node tests/unit/test-final-report-vocabulary.js    # 単語帳・レポート
```

## デバッグとトラブルシューティング
```bash
# Electronのデバッグモード
npm run electron -- --inspect

# ログ確認
tail -f logs/univoice-$(date +%Y-%m-%d).jsonl

# プロセス確認（Windows）
tasklist | findstr electron
tasklist | findstr node

# メモリ使用量確認
wmic process where name="electron.exe" get WorkingSetSize,Name
```

## Git操作
```bash
# ブランチ作成
git checkout -b feature/your-feature-name

# 変更確認
git status
git diff

# コミット（conventional commits形式）
git add .
git commit -m "feat: add new feature"
git commit -m "fix: resolve translation delay"
git commit -m "docs: update README"

# リモートにプッシュ
git push -u origin feature/your-feature-name
```

## 環境変数の確認
```bash
# 環境変数の存在確認（Windows）
echo %OPENAI_API_KEY%
echo %DEEPGRAM_API_KEY%

# PowerShell
$env:OPENAI_API_KEY
$env:DEEPGRAM_API_KEY

# .envファイルの確認
type .env | findstr API_KEY
```

## パフォーマンス計測
```bash
# メトリクス計測（存在する場合）
npm run metrics

# ベンチマーク実行（存在する場合）
npm run benchmark

# メモリプロファイリング
node --inspect tests/performance/streaming-performance.test.ts
```

## プロジェクト構造確認
```bash
# ディレクトリ構造表示
tree /F electron\services
tree /F src\components

# ファイル検索（Windows）
dir /s /b *.ts | findstr /i "pipeline"
dir /s /b *.tsx | findstr /i "univoice"

# PowerShell版
Get-ChildItem -Recurse -Filter "*.ts" | Select-String "UnifiedPipeline"
```

## エラー時の対処
```bash
# node_modules再インストール
rmdir /s /q node_modules
npm install

# TypeScriptキャッシュクリア
rmdir /s /q dist
rmdir /s /q dist-electron
npm run build

# Electronキャッシュクリア
rmdir /s /q "%APPDATA%\univoice"
```

## プロダクションビルド
```bash
# Windows用パッケージング（package.jsonに定義されている場合）
npm run package

# インストーラー作成（設定がある場合）
npm run make
```

## 重要な確認コマンド
```bash
# Node.jsバージョン確認（18以上必須）
node -v

# npmバージョン確認
npm -v

# TypeScriptバージョン確認
npx tsc -v

# 依存関係の脆弱性チェック
npm audit

# 依存関係の更新確認
npm outdated
```