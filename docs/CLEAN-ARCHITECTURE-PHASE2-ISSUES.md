# Clean Architecture Phase 2 - 課題記録と分析

作成日: 2025-08-23
最終更新: 2025-08-23

## 📊 現在の状況

### Phase 1 完了項目（2025-08-22）
- ✅ SetupSection 抽出（100行削減）
- ✅ RealtimeSection 抽出（71行削減） 
- ✅ HistorySection 抽出（145行削減）
- **合計削減行数**: 316行（元1800行から17.5%削減）

### 残存するファイルサイズ
- `UniVoice.tsx`: 1697行（さらに増加、巨大）
- `useUnifiedPipeline.ts`: 905行（ビジネスロジックが混在）

## 🔴 発見された課題

### 1. 履歴重複キー問題（最優先）✅ 解決済み（2025-08-23）
**症状**:
```
Warning: Encountered two children with the same key `segment-1755886289931-z4wb09e3z`
```

**原因分析**:
- `translationComplete`イベントが複数の場所で処理されている
- `useUnifiedPipeline`内でhistoryに追加
- `FlexibleHistoryGrouper`でも履歴管理
- 両方が同じセグメントIDを使用

**解決策（2025-08-23実装）**:
- レガシーの`translation-complete`イベントリスナーを削除
- 重複チェック用の不要な状態変数を削除
- 履歴管理を`translation`イベント内で一元化
- クリーンでシンプルな実装に変更

**影響範囲**:
- UI表示に警告が出る（機能は動作）→ ✅ 解決
- パフォーマンスへの潜在的影響 → ✅ 改善

### 2. 履歴表示UIの改善要望（2025-08-23追加）
**現状の問題点**:
- ダークテーマ（#1a1a1a）で視認性が低い
- 装飾要素（ブロックヘッダー、文番号等）が多すぎる
- インラインスタイルでメンテナンス性が低い
- UniVoiceの他セクションとデザイン不統一

**改善案**:
- ライトテーマへの変更（白背景）
- シンプルな2カラムレイアウト
- 装飾要素の最小化
- CSS-in-JSからCSSモジュールへの移行

### 3. GPT-5翻訳の推論漏れ問題（2025-08-23追加）
**症状**:
- 一部の翻訳でGPT-5の内部推論プロセスが出力される
- 例: "and i'm here to make the art" → 260文字の説明付き翻訳

**原因**:
- システムプロンプトで「Output ONLY the Japanese translation」と指定しているが守られない
- `reasoning: { effort: 'minimal' }`の設定が効いていない
- 特定の入力パターンで発生する傾向

**対策案（未実装）**:
1. 翻訳結果の後処理で推論部分を除去
2. システムプロンプトの強化
3. reasoning設定の調整

### 4. 多言語対応実装（2025-08-23追加）
**実装内容**:
- SetupSectionに言語選択UI追加（16言語対応）
- UnifiedPipelineServiceで動的プロンプト生成
- 言語設定のLocalStorage保存

**残課題**:
- AdvancedFeatureService（要約・語彙・レポート）が日本語固定
- エラーメッセージの多言語化未対応
- UIテキストの多言語化未対応

### 2. アーキテクチャの不整合

#### ディレクトリ構造の混在
```
src/
├── components/           # 旧構造
│   ├── UniVoice.tsx     # メインコンポーネント（巨大）
│   └── UniVoice/        # 分割されたコンポーネント置き場？
└── presentation/        # 新構造（Clean Architecture）
    └── components/
        └── UniVoice/
            └── sections/  # 抽出されたセクション
```

**問題点**:
- 2つの異なる構造が混在
- どちらを正とするか不明確
- インポートパスが複雑化

#### 状態管理の分散
- `UniVoice.tsx`: 20個以上のuseState
- `useUnifiedPipeline.ts`: パイプライン関連の状態
- 各セクション: 独自の内部状態
- Context APIの未使用

### 3. 責任の不明確さ

#### UniVoice.tsx に残っている責任（1697行）
1. **モーダル管理**（約400行）
   - FullscreenModal（履歴全文表示）
   - MemoModal（メモ一覧）
   - ReportModal（最終レポート）

2. **要約セクション**（約150行）
   - 英日対比表示
   - クリックで拡大
   - パフォーマンス指標

3. **ユーザー入力セクション**（約200行）
   - テキスト入力
   - メモ保存
   - 英訳生成

4. **ビジネスロジック**（約300行）
   - レポート生成
   - エクスポート機能
   - セッション管理
   - タイマー管理

5. **UI制御**（約200行）
   - リサイズハンドル
   - キーボードショートカット
   - 自動保存タイマー

6. **その他**（約234行）
   - ヘルパー関数
   - スタイル定義
   - イベントハンドラー

### 4. テストの不足
- 単体テストがない
- 統合テストが不完全
- E2Eテストの未実装

### 5. 型安全性の問題
- any型の使用箇所が存在
- エラーハンドリングの不統一
- イベント型の不完全な定義

## 🎯 Phase 2 で解決すべき優先事項

### 優先度: 最高
1. 履歴重複キー問題の修正
2. SummarySectionの抽出
3. UserInputSectionの抽出

### 優先度: 高
4. モーダルコンポーネントの分離
5. ディレクトリ構造の統一
6. ビジネスロジックの分離

### 優先度: 中
7. 状態管理の中央集権化（Context API）
8. テストの実装
9. 型安全性の向上

## 📋 モジュール説明（予定）

### SummarySection
**責任**: 要約の表示とインタラクション
**依存**: 
- summaryEnglish, summaryJapanese (props)
- expandedSection (UI状態)
**公開インターフェース**:
```typescript
interface SummarySectionProps {
  summaryEnglish: string;
  summaryJapanese: string;
  height: number;
  isExpanded: boolean;
  onClick: () => void;
  onResize: (e: React.MouseEvent) => void;
}
```

### UserInputSection  
**責任**: ユーザー入力の受付と処理
**依存**:
- generateEnglishQuestion (翻訳機能)
- memoList (メモ管理)
**公開インターフェース**:
```typescript
interface UserInputSectionProps {
  height: number;
  onSubmit: (text: string) => void;
  onMemoSave: (memo: Memo) => void;
  onShowMemoModal: () => void;
  memoCount: number;
}
```

### ModalComponents
**責任**: 各種モーダルの表示
**サブコンポーネント**:
- FullscreenModal
- MemoModal  
- ReportModal
**特徴**: 完全に独立したプレゼンテーション層

### BusinessLogicServices
**責任**: ビジネスルールの実装
**サービス**:
- ReportGenerationService
- ExportService
- SessionManagementService
**特徴**: UIから完全に分離

## 🛡️ リスク評価

### 高リスク項目
1. **履歴機能の破壊**
   - 二重管理を解消する際の不整合
   - グループ化ロジックへの影響

2. **セッション管理の破壊**
   - タイマー管理の分離時
   - 状態同期の問題

3. **メモ機能の破壊**
   - モーダルとの連携
   - 保存機能との整合性

### 中リスク項目
1. パフォーマンスの劣化
2. バンドルサイズの増加
3. 開発速度の低下

## 📝 今後の作業メモ

### 即座に対応すべき
- 多言語対応の動作テスト 🔄
- GPT-5翻訳の推論漏れ問題の修正
- 履歴表示UIの改善（ライトテーマ化）

### 段階的に対応
- コンポーネントの抽出を1つずつ
- 各抽出後に必ず動作確認
- ドキュメントの随時更新

### 将来的な改善
- TypeScript strictモードの完全準拠
- パフォーマンス最適化
- アクセシビリティ対応
- UIテキストの完全多言語化（i18n）

---

このドキュメントは作業の進行に伴い随時更新されます。