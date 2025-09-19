# UniVoice 2.0 プロジェクト概要

## プロジェクトの目的
UniVoice 2.0は、リアルタイム音声認識・翻訳・要約を統合した教育支援アプリケーションです。教育現場での多言語対応とリアルタイム理解支援を目的としています。

## 主要機能
1. **リアルタイム音声認識** - Deepgram Nova-3による10言語対応
2. **二段階翻訳システム** - リアルタイム（GPT-5-nano）と高品質（GPT-5-mini）
3. **プログレッシブ要約** - 400/800/1600/2400語単位での段階的要約
4. **文単位履歴管理** - SentenceCombinerによる2-3文の意味単位結合
5. **最終レポート生成** - Markdown形式での授業全体のレポート
6. **重要語句抽出** - 専門用語5-10個の抽出と対訳

## 技術スタック
- **フロントエンド**: React 18.3 + TypeScript 5.6
- **バックエンド**: Electron 33.2 + Node.js 24.4
- **音声認識**: Deepgram Nova-3 (WebSocket)
- **AI処理**: OpenAI GPT-5シリーズ (Responses API)
- **ビルドツール**: Vite
- **テスト**: Jest + Playwright

## アーキテクチャ
- **パターン**: Clean Architecture + CQRS + Event-Driven
- **IPC通信**: Zod検証による型安全な通信
- **状態管理**: React Hooks + Event System

## 現在の実装状況（2025-09-17時点）
- リアルタイム機能: 100%完了
- 高度な機能: 70%実装（バックエンド完了、UI統合に課題）
- データ永続化: 0%（SessionStorageService未使用）
- 全体進捗: 約50%

## 重要な課題
1. **データ永続化の欠如** - SessionStorageServiceが実装済みだが完全に未使用
2. **Setup画面の統一問題** - SetupScreenとSetupSectionの2つが混在
3. **プログレッシブ要約のUI問題** - バックエンドは動作するがUIに表示されない