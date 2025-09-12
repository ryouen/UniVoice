# CSS詳細比較と統合計画

## 3. .recording-indicator-green クラスの比較

### メイン定義（169-175行）
```css
.recording-indicator-green {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}
```

### 重複部分（1887-1897行）
```css
.recording-indicator-green {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: rgba(76, 175, 80, 0.2);
  border-radius: 10px;
  color: white;
  font-size: 14px;
  height: 36px;
}
```

### 差分分析
| プロパティ | メイン定義 | 重複部分 | 影響 |
|-----------|----------|---------|------|
| padding | なし | 8px 14px | 内部余白の有無 |
| background | なし | rgba(76, 175, 80, 0.2) | 背景色の有無 |
| border-radius | なし | 10px | 角丸の有無 |
| color | なし | white | テキスト色の有無 |
| height | なし | 36px | 高さ固定の有無 |
| font-weight | 500 | なし | フォント太さ |

### 統合の必要性
- 重複部分の方がより完全なスタイル定義を持っている
- 視覚的に重要なプロパティ（background、border-radius、padding）が欠けている
- これらは意図的に追加された可能性が高い

## 4. 最終的な移植計画

### Phase 1: 差分の特定（完了）
- .headerクラス：paddingとborder-radiusの差異
- .recording-indicator-green：視覚的プロパティの欠如
- その他のクラスも同様の問題がある可能性

### Phase 2: 統合方針の決定
1. **保守的アプローチ**：重複部分の追加プロパティをメイン定義に統合
2. **理由**：重複部分にはより洗練されたデザイン要素が含まれている

### Phase 3: 実装計画
1. バックアップの作成
2. 各クラスの差分を1つずつ統合
3. 各変更後に視覚的確認
4. 重複部分の削除
5. 最終的なビルドとテスト

### リスク評価
- **低リスク**：CSSの変更は視覚的なものに限定
- **中リスク**：-webkit-app-regionの維持が重要（ウィンドウドラッグ機能）
- **要確認**：統合後の視覚的な整合性

## 5. 具体的な統合手順

### Step 1: .headerの統合
```css
.header {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 12px 20px; /* 重複部分から採用 */
  gap: 10px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 20px 20px 0 0; /* 重複部分から追加 */
  position: relative;
  -webkit-app-region: drag;
}
```

### Step 2: .recording-indicator-greenの統合
```css
.recording-indicator-green {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px; /* 重複部分から追加 */
  background: rgba(76, 175, 80, 0.2); /* 重複部分から追加 */
  border-radius: 10px; /* 重複部分から追加 */
  color: white; /* 重複部分から追加 */
  font-size: 14px;
  font-weight: 500; /* メイン定義から維持 */
  height: 36px; /* 重複部分から追加 */
}
```

### Step 3: その他のクラスも同様に分析・統合

### Step 4: 重複部分（1878行目以降）の削除

## 6. テスト計画

### 視覚的確認項目
- [ ] ヘッダーの外観（角丸、パディング）
- [ ] 録音インジケーターの背景色と角丸
- [ ] ウィンドウのドラッグ機能
- [ ] 各テーマ（light/dark/purple）での表示
- [ ] ボタンのホバー効果
- [ ] ツールチップの表示

### 機能的確認項目
- [ ] ヘッダーのドラッグによるウィンドウ移動
- [ ] ボタンのクリック動作
- [ ] テーマ切り替え