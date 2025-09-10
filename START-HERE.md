# 🚀 START HERE - UniVoice 2.0 開発ガイド

**最終更新**: 2025-09-10 (パラグラフモード実装状況の再調査)  
**状態**: 🚧 Phase 2 パラグラフモード要改善 / 🚧 Phase 3 Advanced Features実装中  
**実装者**: Claude Code

## ✅ 最新の実装状況（2025-09-10更新）

### パラグラフモードの実際の状況
**重要な発見**:
- パラグラフモード（ParagraphBuilder）は**現在無効化されている**
- 履歴表示は文単位（1-2文）のまま
- 改善が必要な状態
- 詳細: [`docs/PARAGRAPH-MODE-IMPLEMENTATION-SUMMARY.md`](docs/PARAGRAPH-MODE-IMPLEMENTATION-SUMMARY.md)
- 改善計画: [`docs/PARAGRAPH-MODE-IMPROVEMENT-PLAN.md`](docs/PARAGRAPH-MODE-IMPROVEMENT-PLAN.md)

### データ永続化機能（2025-08-28）
**成果**:
- ファイルシステムベースの永続化（C:\Users\{username}\UniVoice\）
- 自動保存（3分ごと）とセッション再開機能
- 詳細: [`docs/DATA-PERSISTENCE-IMPLEMENTATION-STATUS.md`](docs/DATA-PERSISTENCE-IMPLEMENTATION-STATUS.md)

## 🎉 最近の成果

### AdvancedFeatureServiceバグ修正完了（2025-09-04確認）
**結果**: 2025-08-30に報告された未初期化バグは既に修正済み
**現状**: 要約、語彙抽出、最終レポート機能がすべて動作可能
**詳細**: [`docs/ADVANCED-FEATURE-SERVICE-VERIFICATION-20250904.md`](docs/ADVANCED-FEATURE-SERVICE-VERIFICATION-20250904.md)

## 🎯 現在の優先課題

1. **セッション再開UIの実装**（優先度: 高）
2. **レポート生成UIの追加**（優先度: 中）
3. **語彙データのエクスポート機能**（優先度: 低）

## 📊 実装状態マトリックス

| 機能 | 状態 | 備考 |
|------|------|------|
| 基本音声認識 | ✅ | Deepgram Nova-3 |
| リアルタイム翻訳 | ✅ | GPT-5-nano |
| パラグラフ履歴 | ❌ | ParagraphBuilder無効化中、文単位表示 |
| データ永続化 | ✅ | ファイルシステム実装 |
| 進捗的要約 | ✅ | 400, 800*n語での要約（CJK言語は文字数×4） |
| 定期要約 | ❌ | 無効化済み（不要のため） |
| 語彙抽出 | ✅ | 専門用語5-10個抽出 |
| 最終レポート | ✅ | Markdown形式で生成 |

## 🚀 Quick Start

```bash
# 環境変数設定
cp .env.example .env
# APIキーを設定

# 開発環境起動
npm run dev
npm run electron

# テスト実行
npm test
```

## 📁 プロジェクト構造

```
UniVoice/
├── docs/ACTIVE/          # アクティブな作業状態
│   ├── STATE.json       # 現在の状態
│   └── TASKS.json       # タスクリスト
├── electron/            # バックエンド
│   └── services/        # Clean Architecture
├── src/                 # フロントエンド
└── tests/               # テストスイート
```

## 📚 重要ドキュメント

- [`CLAUDE.md`](CLAUDE.md) - プロジェクト設定と最上位ルール
- [`docs/ACTIVE/STATE.json`](docs/ACTIVE/STATE.json) - 現在の実装状態
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - Clean Architecture設計
- [`docs/BUILD-GUIDE.md`](docs/BUILD-GUIDE.md) - ビルド手順

## 🎯 次のステップ

1. **セッション再開UIの実装**（優先度: 高） - データ永続化は完成、UIが未実装
2. **レポート生成UIの追加**（優先度: 中） - バックエンドは実装済み
3. **語彙データのエクスポート機能**（優先度: 低）
4. **パフォーマンス最適化**（優先度: 低）

---
詳細は各ドキュメントを参照してください。