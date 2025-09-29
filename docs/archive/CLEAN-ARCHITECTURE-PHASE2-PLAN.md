# Clean Architecture Phase 2 実装計画

作成日: 2025-08-23
バージョン: 1.0.0

## 🎯 Phase 2 の目標

1. **UniVoice.tsx を500行以下に削減**（現在1484行）
2. **単一責任の原則の徹底**
3. **テスタブルな構造の実現**
4. **既存機能の完全な保持**

## 🏗️ アーキテクチャ設計

### 最終的なディレクトリ構造
```
UniVoice/
├── src/
│   ├── domain/                    # ドメイン層（ビジネスルール）
│   │   ├── entities/
│   │   │   ├── Session.ts
│   │   │   ├── Translation.ts
│   │   │   ├── Summary.ts
│   │   │   ├── Memo.ts
│   │   │   └── Report.ts
│   │   └── services/
│   │       ├── ReportGenerationService.ts
│   │       └── ExportService.ts
│   │
│   ├── application/               # アプリケーション層
│   │   ├── usecases/
│   │   │   ├── GenerateReportUseCase.ts
│   │   │   ├── ExportDataUseCase.ts
│   │   │   └── SaveMemoUseCase.ts
│   │   └── services/
│   │       └── SessionManagementService.ts
│   │
│   ├── infrastructure/            # インフラ層
│   │   ├── persistence/
│   │   │   └── LocalStorageAdapter.ts
│   │   └── export/
│   │       ├── WordExporter.ts
│   │       └── PDFExporter.ts
│   │
│   ├── presentation/              # プレゼンテーション層
│   │   ├── components/
│   │   │   └── UniVoice/
│   │   │       ├── UniVoice.tsx                 # メインコンテナ（500行以下）
│   │   │       ├── sections/
│   │   │       │   ├── SetupSection/            # ✅ 完了
│   │   │       │   ├── RealtimeSection/         # ✅ 完了
│   │   │       │   ├── HistorySection/          # ✅ 完了
│   │   │       │   ├── SummarySection/          # 🔄 Phase 2
│   │   │       │   └── UserInputSection/        # 🔄 Phase 2
│   │   │       ├── modals/
│   │   │       │   ├── FullscreenModal/         # 🔄 Phase 2
│   │   │       │   ├── MemoModal/               # 🔄 Phase 2
│   │   │       │   └── ReportModal/             # 🔄 Phase 2
│   │   │       └── controls/
│   │   │           ├── ResizeHandle.tsx         # 🔄 Phase 2
│   │   │           └── SessionControls.tsx      # 🔄 Phase 2
│   │   │
│   │   ├── hooks/
│   │   │   ├── core/
│   │   │   │   └── useUnifiedPipeline.ts       # リファクタリング予定
│   │   │   ├── ui/
│   │   │   │   ├── useResize.ts                # 🔄 Phase 2
│   │   │   │   ├── useModal.ts                 # 🔄 Phase 2
│   │   │   │   └── useKeyboardShortcuts.ts     # 🔄 Phase 2
│   │   │   └── business/
│   │   │       ├── useReport.ts                # 🔄 Phase 2
│   │   │       ├── useExport.ts                # 🔄 Phase 2
│   │   │       └── useMemo.ts                  # 🔄 Phase 2
│   │   │
│   │   └── contexts/
│   │       ├── SessionContext.tsx               # 🔄 Phase 2
│   │       └── UIContext.tsx                    # 🔄 Phase 2
│   │
│   └── shared/                    # 共有リソース
│       ├── constants/
│       ├── types/
│       └── utils/
```

## 📅 実装スケジュール

### Week 1: 基盤整備と最優先課題（3日間）

#### Day 1: 履歴重複キー問題の修正
**作業内容**:
1. 問題の根本原因調査
2. 修正実装
3. テスト作成
4. 動作確認

**成功基準**:
- 警告が消える
- 履歴が正しく表示される
- パフォーマンスに影響なし

#### Day 2: SummarySection の抽出
**作業内容**:
1. コンポーネント設計
2. 実装（約150行の抽出）
3. props インターフェース定義
4. 動作確認

**テスト項目**:
- 要約データの表示
- クリックイベント
- リサイズ機能

#### Day 3: UserInputSection の抽出
**作業内容**:
1. コンポーネント設計
2. 実装（約200行の抽出）
3. メモ機能との連携確認
4. 動作確認

**テスト項目**:
- テキスト入力
- 英訳生成
- メモ保存

### Week 2: モーダルとビジネスロジック（4日間）

#### Day 4-5: モーダルコンポーネントの分離
**作業内容**:
1. 共通モーダルコンポーネント作成
2. 各モーダルの実装
   - FullscreenModal（100行）
   - MemoModal（100行）
   - ReportModal（100行）
3. モーダル管理フックの作成

#### Day 6-7: ビジネスロジックの分離
**作業内容**:
1. ReportGenerationService の実装
2. ExportService の実装
3. SessionManagementService の実装
4. カスタムフックへの移行

### Week 3: 構造統一と最適化（3日間）

#### Day 8: Context API の導入
**作業内容**:
1. SessionContext の実装
2. UIContext の実装
3. 既存コンポーネントの移行

#### Day 9: ディレクトリ構造の統一
**作業内容**:
1. ファイル移動
2. インポートパスの修正
3. 不要ファイルの削除

#### Day 10: 最終調整とテスト
**作業内容**:
1. 統合テスト実装
2. パフォーマンステスト
3. ドキュメント更新

## 🛡️ バックアップ戦略

### 1. Git ブランチ戦略
```bash
# Phase 2 開始時のバックアップ
git checkout -b backup/phase2-start-20250823
git push origin backup/phase2-start-20250823

# 各作業用ブランチ
git checkout -b feature/fix-history-duplicate-key
git checkout -b feature/extract-summary-section
git checkout -b feature/extract-user-input-section
git checkout -b feature/extract-modals
git checkout -b feature/separate-business-logic
git checkout -b feature/introduce-context-api
```

### 2. 段階的コミット
- 各機能抽出は独立したコミット
- 意味のある単位でコミット
- コミットメッセージは明確に

### 3. ロールバック計画
```bash
# 問題発生時の即座のロールバック
git reset --hard HEAD~1
git checkout backup/phase2-start-20250823
```

## 🧪 テスト戦略

### 1. 単体テスト（各コンポーネント）
```typescript
// SummarySection.test.tsx
describe('SummarySection', () => {
  it('要約データを正しく表示する', () => {
    const { getByText } = render(
      <SummarySection 
        summaryEnglish="Test summary"
        summaryJapanese="テスト要約"
        height={12}
        isExpanded={false}
        onClick={jest.fn()}
        onResize={jest.fn()}
      />
    );
    expect(getByText('Test summary')).toBeInTheDocument();
    expect(getByText('テスト要約')).toBeInTheDocument();
  });

  it('クリックで拡大イベントが発火する', () => {
    const handleClick = jest.fn();
    const { container } = render(
      <SummarySection onClick={handleClick} {...defaultProps} />
    );
    fireEvent.click(container.firstChild);
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### 2. 統合テスト（機能フロー）
```typescript
// integration/summary-flow.test.tsx
describe('要約機能の統合テスト', () => {
  it('10分経過後に要約が生成される', async () => {
    // セッション開始
    // 10分待機（またはタイマーモック）
    // 要約生成確認
    // UI表示確認
  });
});
```

### 3. E2Eテスト（シナリオ）
```typescript
// e2e/full-session.test.tsx
describe('完全なセッションフロー', () => {
  it('180分の授業を完走できる', async () => {
    // セットアップ画面
    // セッション開始
    // 音声認識・翻訳
    // 要約生成
    // レポート作成
    // データ保存確認
  });
});
```

### 4. パフォーマンステスト
```typescript
// performance/render.test.tsx
describe('レンダリングパフォーマンス', () => {
  it('初期表示が1秒以内', async () => {
    const start = performance.now();
    render(<UniVoice />);
    const end = performance.now();
    expect(end - start).toBeLessThan(1000);
  });
});
```

## ✅ チェックリスト（各作業前に確認）

### 作業開始前
- [ ] 現在のブランチを確認
- [ ] 最新のmainをpull
- [ ] 作業用ブランチを作成
- [ ] 既存のテストが全て通ることを確認

### 実装中
- [ ] 単一責任の原則を守っているか
- [ ] 既存機能を壊していないか
- [ ] TypeScriptの型安全性を保っているか
- [ ] エラーハンドリングを適切に行っているか

### 実装後
- [ ] テストを作成したか
- [ ] 手動で動作確認したか
- [ ] コードレビューの準備ができているか
- [ ] ドキュメントを更新したか

## 🎯 成功指標

### コード品質
- [ ] UniVoice.tsx が500行以下
- [ ] 各ファイルが300行以下
- [ ] 循環依存がゼロ
- [ ] TypeScript エラーがゼロ

### 機能性
- [ ] 全ての既存機能が動作
- [ ] パフォーマンスの劣化なし
- [ ] 新しいバグの発生なし

### 保守性
- [ ] テストカバレッジ 70%以上
- [ ] ドキュメント完備
- [ ] 新機能追加が容易

## 📝 注意事項

1. **既存機能の保護**
   - 動作確認を怠らない
   - 不明な場合は削除しない
   - バックアップを取る

2. **段階的な実装**
   - 一度に大きな変更をしない
   - 各ステップで動作確認
   - 問題があれば即座に戻す

3. **コミュニケーション**
   - 進捗を定期的に報告
   - 問題は早めに共有
   - 不明点は確認する

---

このプランは状況に応じて柔軟に調整されます。
重要なのは既存機能を壊さずに、着実に改善を進めることです。