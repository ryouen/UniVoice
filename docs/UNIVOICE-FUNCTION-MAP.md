# UniVoice.tsx 関数マッピング（外部記憶装置）

## 目的
- UniVoice.tsx内の関数を完全に理解し、混同を避ける
- 行番号と機能を明確にマッピング
- セッション管理フローを正確に把握

## 調査開始: 2025-09-16

### 主要な状態管理
- activeSession (line 240-276): セッション状態
- showSetup (line 287): Setup画面表示フラグ
- selectedClass (line 288): 選択されたクラス名

### 関数一覧（完全版）

#### セッション管理関連
1. **handleStartSession** (line 484-513 in useCallback): セッション開始処理  
   - 役割: Setup画面から授業を開始
   - ✅ 正しく実装されている:
     - line 494: setActiveSession(newSession) を呼んでいる
     - line 511: sessionStorageService.saveActiveSession(newSession) も呼んでいる
   - 設定する状態: activeSession, selectedClass, sourceLanguage, targetLanguage, showSetup

2. **endSession** (line 654): セッション終了処理
   - 役割: 授業を終了してレポート生成
   - パイプライン停止、レポート生成

3. **nextClass** (line 696): 次の授業へ移行  
   - 役割: レポート保存して新しいSetup画面へ
   - clearAllContentを呼ぶ
   - Setup画面へ戻る（setShowSetup(true)）

4. **togglePause** (line 631): 一時停止/再開
   - 役割: パイプラインの一時停止と再開

#### コンテンツ管理関連
5. **clearAllContent** (line 720): すべてのコンテンツをクリア
6. **generateFinalReport** (line 747): 最終レポート生成
7. **generateReport** (line 793): レポート生成（後方互換）

#### UI操作関連
8. **handleKeyDown** (line 407): キーボードショートカット
9. **handleMouseMove** (line 543): マウス移動（リサイズ）
10. **handleMouseUp** (line 558): マウスアップ（リサイズ終了）
11. **handleResizeMouseDown** (line 978): リサイズハンドルのマウスダウン

#### エクスポート関連
12. **handleWordExport** (line 824): Word形式でエクスポート
13. **handlePDFExport** (line 850): PDF形式でエクスポート

#### セクションクリック関連
14. **handleHistoryClick** (line 877): 履歴セクションクリック
15. **handleSummaryClick** (line 886): 要約セクションクリック

#### メモ関連
16. **saveAsMemo** (line 905): メモとして保存
17. **addMemoMarkerToHistory** (line 932): 履歴にメモマーカー追加
18. **generateEnglishQuestion** (line 946): 日本語質問を英訳
19. **saveMemoEdit** (line 962): メモの編集を保存

#### ユーティリティ関連
20. **expandInput** (line 896): 入力エリアの拡大/縮小
21. **adjustFontSize** (line 806): フォントサイズ自動調整
22. **splitText** (line 989): テキストを3分割
23. **formatTime** (line 999): 時間フォーマット
24. **getAlignedHistoryContent** (line 1006): 整列された履歴コンテンツ
25. **getSummaryComparisonContent** (line 1046): 要約比較コンテンツ
26. **getSectionStyle** (line 1105): セクションスタイル計算

## setActiveSession の呼び出し箇所
1. **初期化時** (line 240-276): useState の初期値設定
2. **nextClass内のuseCallback** (line 615): nullに設定してリセット
3. **handleStartSession内** (line 592-629): ⚠️ **呼ばれていない！**

## 現在の問題点
1. **根本原因**: handleStartSessionでsetActiveSessionを呼んでいない
   - そのため、activeSessionが更新されない
   - 結果として、304-306行目のuseEffectによる永続化も発火しない
2. **副作用**: Setup画面スキップ問題
   - 過去のセッションデータが残存していた場合、それが復元される
   - 新しいセッションを開始してもactiveSessionが更新されない

## セッション管理フローの問題
```
[Setup画面] 
   ↓ 
[handleStartSession] → ❌ setActiveSessionを呼んでいない
   ↓
[activeSessionは初期値のまま]
   ↓
[永続化されない]
   ↓
[リロード時に古いデータが復元される可能性]
```

## 真の問題点の発見
1. **handleStartSessionは正しく実装されている** (line 484-513)
   - setActiveSession(newSession) を呼んでいる ✅
   - sessionStorageService.saveActiveSession も呼んでいる ✅

2. **endSessionがactiveSessionをクリアしていない** (line 653-693) 
   - レポート生成はするが、activeSessionをクリアしない ❌
   - そのため、次回起動時に前のセッションが残る

3. **nextClassは正しくクリアしている** (line 615 in useCallback)
   - setActiveSession(null) を呼んでいる ✅
   - sessionStorageService.clearActiveSession() も呼んでいる ✅

## 修正案
endSession内で、レポート生成後に以下を追加する必要がある：
```javascript
// activeSessionをクリア
setActiveSession(null);
sessionStorageService.clearActiveSession();
// Setup画面に戻る
setShowSetup(true);
setSelectedClass(null);
```