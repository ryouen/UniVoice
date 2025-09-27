# 命名規則強制ガイド

## 概要

2日間のデバッグを要した「on/handleの混同によるイベントハンドラ設定ミス」を二度と起こさないための防止策と実施ガイド。

## 1. 問題の根本原因

### 1.1 発見された致命的なバグ

```typescript
// ❌ 誤り: 関数定義に"on"プレフィックス
const onPipelineEvent = () => {
  // イベント処理
};

// ❌ 誤り: プロパティ名とハンドラ名の不一致
{
  onEvent: handleDifferentEvent  // 別のハンドラが設定される
}
```

### 1.2 影響

- イベントハンドラが正しく設定されず、機能が動作しない
- エラーメッセージが出ないため、原因特定が困難
- 2日間の貴重な開発時間を無駄にした

## 2. 命名規則

### 2.1 イベントハンドラ

```typescript
// ✅ 正しい命名規則
const handlePipelineEvent = () => { };     // 関数名: handle[Event]
const props = {
  onPipelineEvent: handlePipelineEvent     // プロパティ名: on[Event]
};

// インターフェース定義
interface Props {
  onPipelineEvent?: () => void;            // コールバックプロパティ
}
```

### 2.2 言語関連

```typescript
// ❌ 避けるべき
const japanese = "日本語";
const english = "English";
originalText, translatedText

// ✅ 推奨
const sourceLanguage = "ja";               // ISO言語コード
const targetLanguage = "en";
sourceText, targetText
```

## 3. 自動チェックツール

### 3.1 実行方法

```bash
# 命名規則チェック
npm run check:naming

# 型チェックと命名規則チェックを同時に実行
npm run check:all

# ビルド前の自動チェック（prebuild hook）
npm run build  # 自動的にcheck:allが実行される
```

### 3.2 検出項目

1. **イベントハンドラの誤用**
   - 関数名に"on"プレフィックスがついている
   - プロパティ名とハンドラ名の不一致

2. **言語名のハードコーディング**
   - japanese/englishの文字列使用

3. **型定義の重複**
   - 同一ファイル内での型の重複定義

4. **用語の不統一**
   - original/translation vs source/target

5. **未使用のサービス**
   - importされているが使用されていないサービス

## 4. CI/CDへの統合

### 4.1 GitHub Actions設定

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run check:all
```

### 4.2 pre-commitフック

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run check:naming
```

## 5. VSCode設定

### 5.1 スニペット

```json
// .vscode/snippets/typescript.json
{
  "Event Handler": {
    "prefix": "handler",
    "body": [
      "const handle${1:EventName} = useCallback((${2:params}) => {",
      "  ${3:// Implementation}",
      "}, [${4:deps}]);",
      "",
      "// Usage: on${1:EventName}={handle${1:EventName}}"
    ]
  }
}
```

### 5.2 ESLint規則

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    "naming-convention": [
      "error",
      {
        selector: "variable",
        format: ["camelCase"],
        filter: {
          regex: "^on[A-Z]",
          match: false
        }
      }
    ]
  }
};
```

## 6. チーム教育

### 6.1 コードレビューチェックリスト

- [ ] イベントハンドラは`handle`プレフィックスで始まる
- [ ] プロパティは`on`プレフィックスで始まる
- [ ] 言語コードはISO形式（ja, en）
- [ ] source/targetの用語統一
- [ ] 型定義の重複がない

### 6.2 ドキュメント

- このガイドを新規メンバーの必読資料とする
- 月次でチェック結果をレビュー
- 違反パターンを継続的に収集・更新

## 7. ログ出力最適化

### 7.1 問題

開発環境でログが過剰に出力される問題が報告されている。

### 7.2 対策

```typescript
// 環境変数での制御
LOG_LEVEL=warn  // debug, info, warn, error

// コンポーネント別の制御
const componentLogger = logger.child('ComponentName');
componentLogger.debug('詳細ログ');  // LOG_LEVEL=debugの時のみ出力
```

### 7.3 推奨設定

```bash
# 開発環境
LOG_LEVEL=info

# 本番環境  
LOG_LEVEL=warn

# デバッグ時
LOG_LEVEL=debug
```

## まとめ

「on/handleの混同」による2日間の無駄を二度と繰り返さないため、以下を徹底する：

1. **自動チェックの活用** - `npm run check:naming`を定期実行
2. **CI/CDでの強制** - マージ前に必ずチェック
3. **チーム全体での意識統一** - コードレビューでの指摘
4. **継続的な改善** - 新しいパターンの追加

これらの対策により、同様の問題を未然に防ぎ、開発効率を向上させる。