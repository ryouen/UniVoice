# 古いコード削除計画（2025-09-20）

## 🎯 目的
HeaderControlsリファクタリング完了に伴い、古い実装を安全に削除する

## 📋 削除対象コードの分析

### 1. ヘッダー内の古い実装（2323-2414行目）
```typescript
// USE_NEW_HEADER_CONTROLS ? (新実装) : (古い実装)
```

**削除対象の機能：**
- 設定ボタン（歯車アイコン）
- 最前面固定ボタン（ピンアイコン）  
- メニューを隠すボタン（▼アイコン）
- 閉じるボタン（×アイコン）

### 2. USE_NEW_HEADER_CONTROLS定数（272行目）
```typescript
const USE_NEW_HEADER_CONTROLS = true;
```

### 3. 関連する未使用関数の可能性
- toggleHeader関数（useHeaderControlsフックで置き換え済み？）

## 🛡️ 安全対策

### バックアップ
- コミット済み: a7ccf00 (feat: HeaderControls refactoring - accurate button alignment)
- ブランチ: refactor/header-controls-clean-architecture

### ロールバック手順
```bash
# 変更を破棄
git checkout -- src/components/UniVoice.tsx

# または特定のコミットに戻る
git reset --hard a7ccf00
```

## 📝 削除手順

### Step 1: 古い実装の削除
1. 条件分岐を削除し、HeaderControlsのみを残す
2. 不要なインデントを整理

### Step 2: USE_NEW_HEADER_CONTROLS定数の削除
1. 定数定義を削除
2. 関連する条件分岐をすべて削除

### Step 3: テストとビルド
1. TypeScriptの型チェック
2. ビルド実行
3. 手動での動作確認

## ⚠️ 注意事項
- HeaderControlsコンポーネントが全ての機能を正しく実装していることを確認
- アプリ終了ボタン（handleCloseWindow）が正常に動作することを確認
- 設定バーの開閉が正常に動作することを確認