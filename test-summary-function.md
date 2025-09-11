# 要約機能動作確認手順
*作成日: 2025-09-10*

## 🎯 目的
進捗的要約機能（400/800/1600/2400語）が正しく動作するか確認する

## 📋 確認手順

### 1. アプリケーション起動
```bash
# ターミナル1: Vite開発サーバー
npm run dev

# ターミナル2: Electron起動（Viteが起動してから）
npm run electron
```

### 2. 設定
- ソース言語: English
- ターゲット言語: Japanese  
- クラス名: Test Session

### 3. 動作確認ポイント

#### A. コンソールログの確認
以下のログが出力されるか確認：
```
[useUnifiedPipeline] progressive-summary received: 
[AdvancedFeatureService] Translation added
[AdvancedFeatureService] Progressive summary threshold reached
[AdvancedFeatureService] Progressive summary generated
```

#### B. UI表示の確認
- ProgressiveSummarySectionに要約が表示されるか
- 400語、800語などのタブが表示されるか
- 要約内容が更新されるか

### 4. デバッグ用チェックリスト

- [ ] translationCompleteイベントが発火している
- [ ] AdvancedFeatureServiceが初期化されている
- [ ] addTranslationが呼ばれている
- [ ] 単語数カウントが正しい
- [ ] progressive-summaryイベントが送信されている
- [ ] フロントエンドでイベントを受信している
- [ ] UIに要約が表示される

### 5. トラブルシューティング

#### 要約が生成されない場合
1. DevToolsのConsoleタブを開く（F12）
2. ログでエラーを確認
3. electron/main.tsのログを確認

#### 閾値に達しない場合
- 英語で400単語は結構長い（約2-3分の会話）
- 日本語の場合は400文字（約1分）

### 6. テスト用の長文

英語で話す場合の例文（約100単語）：
```
Today I want to talk about the importance of clean architecture in software development. 
When we design systems, we need to think about separation of concerns, dependency injection, 
and maintaining clear boundaries between different layers of our application. This helps us 
create more maintainable and testable code. By following principles like single responsibility 
and dependency inversion, we can build systems that are easier to understand and modify over time.
```

これを4-5回繰り返すと400単語の閾値に達します。

## 📊 期待される動作

1. 400単語に達すると最初の要約が生成
2. 800単語で2回目の要約
3. 各要約はタブで切り替え可能
4. 英語の要約と日本語翻訳が並んで表示

## 🔧 デバッグコマンド

Electronのメインプロセスログ確認：
```bash
# Windowsの場合
type %APPDATA%\univoice\logs\main.log

# または開発中はコンソールに直接出力される
```

---
*この手順に従って要約機能の動作を確認してください*