# LocalStorage廃止・ファイルベース設定管理への移行計画

## 📅 作成日: 2025-09-16
## 👤 作成者: Claude Code
## 🎯 目的: UniVoiceの永続化機構を改善し、予測可能な動作を実現する

---

## 1. 現状の問題点

### 1.1 LocalStorage使用による問題
- **Setup画面スキップ問題**: `univoice-active-session`が残存し、アプリ起動時にMain画面が表示される
- **言語設定の不整合**: 空文字列が渡されることがある
- **デバッグ困難**: どこで何が保存されているか追跡が困難
- **データ肥大化**: レポートデータが蓄積し続ける

### 1.2 現在のLocalStorage使用箇所
```
SessionStorageService:
  - univoice-active-session
  - sourceLanguage
  - targetLanguage

UniVoice.tsx（直接使用・削除対象）:
  - sectionHeights
  - lastSession
  - report_${timestamp}

SetupSection:
  - recentClasses
```

---

## 2. 理想的な挙動の定義（合意済み）

### 2.1 基本原則
1. ✅ **アプリ起動時は必ずSetup画面から開始**
2. ✅ **クラス名は全件表示、使用頻度でソート**
3. ✅ **Ctrl+Rで単純にSetup画面に戻る**（データは既に保存済み）
4. ✅ **レポートは明示的な保存操作が必要**

### 2.2 データ永続化の範囲

#### 永続化するもの（ファイルベース）
```json
{
  "defaultLanguages": {
    "source": "ja",
    "target": "en"
  },
  "classUsageStats": {
    "クラス名": {
      "lastUsed": "ISO8601形式の日時",
      "usageCount": 15
    }
  },
  "ui": {
    "theme": "light",
    "fontSize": 1.0
  }
}
```

#### 永続化しないもの（メモリのみ）
- アクティブセッション情報
- 録音中のデータ（DataPersistenceServiceが別途管理）
- リアルタイムの文字起こし・翻訳結果
- 一時的なUI状態

---

## 3. 移行アーキテクチャ

### 3.1 3層アーキテクチャ
```
┌─────────────────────────────────────┐
│         UI Layer (React)            │
│  - メモリ内状態のみ使用             │
│  - LocalStorage直接アクセス禁止     │
└─────────────────────────────────────┘
              ↕ IPC
┌─────────────────────────────────────┐
│    Application Layer (Services)     │
│  - SessionStateManager (メモリ)     │
│  - ConfigurationService (キャッシュ) │
└─────────────────────────────────────┘
              ↕ File I/O
┌─────────────────────────────────────┐
│  Infrastructure Layer (Electron)    │
│  - ConfigService (JSON設定)         │
│  - 既存のBoundsStore活用            │
└─────────────────────────────────────┘
```

### 3.2 実装方針
- **electron-store**の採用（型安全・スキーマ検証）
- 既存のBoundsStoreパターンを参考に実装
- IPCによる非同期通信

---

## 4. 実装計画（3段階）

### Phase 1: LocalStorage依存の即座の除去（1-2日）
1. SessionStorageServiceからactiveSession永続化を無効化
2. UniVoice.tsxの初期化でactiveSessionを常にnullに
3. 直接のlocalStorage使用箇所を削除
4. テストとデバッグ

### Phase 2: ファイルベース設定管理の実装（3-5日）
1. electron-storeの導入
2. ConfigurationServiceの実装
3. IPC通信の設定
4. 言語設定とクラス使用統計の永続化

### Phase 3: UI/UXの改善（将来）
1. 設定画面の追加
2. データのインポート/エクスポート
3. 自動バックアップ機能

---

## 5. リスクと対策

### 5.1 技術的リスク
| リスク | 影響度 | 対策 |
|--------|--------|------|
| ファイルI/Oエラー | 中 | フォールバック機構、メモリキャッシュ |
| 権限不足 | 低 | エラーハンドリング、ユーザー通知 |
| 既存データ移行 | 低 | 移行ツール提供（オプション） |

### 5.2 ユーザー影響
- **プラス面**: 予測可能な動作、デバッグ容易
- **マイナス面**: 初回は必ずSetup画面（慣れが必要）

---

## 6. 成功基準

1. ✅ アプリ起動時は必ずSetup画面が表示される
2. ✅ Ctrl+Rで確実にSetup画面に戻る
3. ✅ 言語設定が正しくデフォルト値として表示される
4. ✅ クラス使用統計が正しくソートされる
5. ✅ 既存の録音・保存機能に影響しない

---

## 7. 参考資料

- [Electron Store Documentation](https://github.com/sindresorhus/electron-store)
- 既存実装: `electron/main/services/BoundsStore.ts`
- 関連Issue: #Setup画面表示問題

---

## 8. 更新履歴

- 2025-09-16: 初版作成（Claude Code）