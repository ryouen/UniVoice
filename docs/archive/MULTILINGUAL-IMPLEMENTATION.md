# UniVoice 多言語対応実装ドキュメント

作成日: 2025-08-23
バージョン: 2.0.0-alpha

## 📌 概要

UniVoice 2.0.0に16言語対応機能を実装しました。ユーザーは授業の言語（ソース言語）と母国語（ターゲット言語）を自由に選択できるようになり、リアルタイム翻訳、要約、語彙抽出、最終レポートの全機能が選択された言語ペアで動作します。

## 🌍 対応言語（16言語）

```typescript
const SUPPORTED_LANGUAGES = [
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' }
];
```

## 🏗️ アーキテクチャ変更

### 1. 言語設定の流れ

```
SetupSection (UI)
    ↓ [言語選択]
UniVoice.tsx 
    ↓ [handleStartSession]
useUnifiedPipeline
    ↓ [IPC: start-session]
UnifiedPipelineService
    ↓ [言語パラメータ]
LanguageConfig.getTranslationPrompt()
```

### 2. 主要コンポーネントの変更

#### SetupSection.tsx
- 言語選択UIの追加（2つのドロップダウン）
- LocalStorageから前回の選択を復元
- デフォルト: 授業言語=English、母国語=日本語

#### UniVoice.tsx
```typescript
// 変更前
const handleStartSession = async (className: string) => { ... }

// 変更後
const handleStartSession = async (
  className: string, 
  sourceLang: string, 
  targetLang: string
) => { ... }
```

#### useUnifiedPipeline.ts
- 動的言語更新のサポート追加
- `updateLanguages`関数でリアルタイム言語切り替え

#### UnifiedPipelineService.ts
- `startListening`メソッドに言語パラメータ追加
- 動的プロンプト生成（LanguageConfig使用）

#### AdvancedFeatureService.ts
- コンストラクタと`start`メソッドに言語パラメータ追加
- 言語別プロンプト生成メソッドの実装
  - `getSummarySystemPrompt()`: 16言語対応
  - `getVocabularyPrompt()`: 3言語+汎用フォールバック
  - `getFinalReportPrompt()`: 3言語+汎用フォールバック

## 💾 データ永続化

言語設定はLocalStorageに保存され、アプリケーション再起動時も保持されます：

```javascript
localStorage.setItem('sourceLanguage', sourceLang);
localStorage.setItem('targetLanguage', targetLang);
```

## 🔧 環境変数

言語設定は環境変数では制御されません。すべてUIから動的に設定されます。

## 📝 プロンプトテンプレート

### 翻訳プロンプト（全16言語対応）
```typescript
function getTranslationPrompt(sourceLanguage: string, targetLanguage: string): string {
  if (sourceLanguage === targetLanguage) {
    return 'Return the input text as-is without any modification.';
  }
  
  const sourceName = LANGUAGE_NAMES[sourceLanguage] || sourceLanguage;
  const targetName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
  
  return `You are a professional translator specializing in real-time lecture translation.
Translate the following ${sourceName} text to ${targetName}.
Maintain the academic tone and technical accuracy.
Output ONLY the ${targetName} translation, nothing else.`;
}
```

### 要約プロンプト（言語別最適化）
- 日本語、英語、中国語は専用プロンプト
- その他の言語は汎用プロンプト（英語ベース）

### 語彙・レポートプロンプト
- 日本語、英語、中国語は詳細な指示
- その他の言語は基本的な指示（英語ベース）

## 🚀 使用方法

1. アプリケーション起動
2. SetupSectionで授業言語と母国語を選択
3. クラス名を入力して「Start Session」
4. 選択した言語ペアで全機能が動作

## 🔍 テスト

```bash
# 多言語対応テスト
node tests/integration/test-multilingual-support.js

# 主要な確認項目
- 翻訳プロンプトの生成
- 同一言語時のスキップ処理
- 要約プロンプトの言語対応
- 語彙抽出の言語対応
- レポート生成の言語対応
```

## ⚠️ 既知の問題

1. **GPT-5翻訳の推論漏れ**
   - 一部の翻訳で内部推論プロセスが出力される
   - `reasoning: { effort: 'minimal' }`が守られない場合がある

2. **UIテキストの多言語化未対応**
   - ボタンやラベルは英語/日本語のまま
   - 将来的にi18n実装が必要

## 🔮 今後の拡張案

1. **言語自動検出**
   - Deepgramの言語検出機能を活用
   - ユーザーの手動選択を不要に

2. **言語別最適化**
   - 言語ペアごとの翻訳品質調整
   - 文化的なニュアンスの考慮

3. **UIの完全多言語化**
   - react-i18nextの導入
   - 全UIテキストの翻訳

## 📚 関連ドキュメント

- [LanguageConfig.ts](../electron/services/domain/LanguageConfig.ts) - 言語設定の実装
- [CLEAN-ARCHITECTURE-PHASE2-ISSUES.md](CLEAN-ARCHITECTURE-PHASE2-ISSUES.md) - 実装中の課題
- [test-multilingual-support.js](../tests/integration/test-multilingual-support.js) - 統合テスト

---

このドキュメントは多言語対応実装の完了時点（2025-08-23）の状態を記録しています。