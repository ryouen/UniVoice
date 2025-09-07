# /DEEP-THINK 分析報告書：履歴表示問題の根本原因

**作成日**: 2025-08-30  
**分析手法**: Serena MCP Server による徹底的コード解析  
**重要度**: 🔴 CRITICAL - コア機能が未実装

## 🔍 観察された現象

1. 履歴ウィンドウに「翻訳中...」が残り続ける
2. 同じ英文が複数回表示される
3. 高品質翻訳が適用されない

## 📊 調査で判明した事実

### 1. SentenceCombinerの使用状況

**クラスの存在**:
- `electron/services/domain/SentenceCombiner.ts` ✅ 存在する
- 文末判定ロジック ✅ 実装されている
- テストケース ✅ 存在し、パスしている

**実際の使用**:
- `new SentenceCombiner` の呼び出し ❌ **ゼロ件**
- UnifiedPipelineService での使用 ❌ **なし**
- どこかでのインスタンス化 ❌ **なし**

### 2. イベントフローの実態

**型定義** (`src/shared/types/contracts.ts:6`):
```typescript
type: 'asr' | 'translation' | 'segment' | 'summary' | 'progressiveSummary' | 'error' | 'status' | 'vocabulary' | 'finalReport' | 'combinedSentence';
```

**実装状況**:
- `combinedSentence` イベントタイプ ✅ 定義済み
- イベント発行コード ❌ **存在しない**
- useUnifiedPipelineのハンドラ ✅ 存在するが**到達不可能**

### 3. 現在の実際のデータフロー

```
[Deepgram] → 0.8秒セグメント
    ↓
[UnifiedPipelineService] → 即座に翻訳
    ↓
[FlexibleHistoryGrouper] → セグメント単位で履歴追加
    ↓
[UI] → 「翻訳中...」のまま表示
```

### 4. 設計されていたデータフロー

```
[Deepgram] → 0.8秒セグメント
    ↓
[SentenceCombiner] → 2-3文に結合 ❌ 未実装
    ↓
[CombinedSentenceEvent] → ID マッピング ❌ 発行されない
    ↓
[高品質翻訳] → history_ プレフィックス付き
    ↓
[履歴更新] → combinedId で更新 ❌ マッピングが空
```

### 5. segmentToCombinedMapの状態

**コード** (`src/hooks/useUnifiedPipeline.ts:118`):
```typescript
const segmentToCombinedMap = useRef<Map<string, string>>(new Map());
```

**実態**:
- 初期化 ✅ 空のMapとして作成
- 値の追加 ❌ CombinedSentenceEventが来ないため**常に空**
- 参照時の結果 → 常に `undefined`

### 6. 高品質翻訳の行き場

**コード** (`src/hooks/useUnifiedPipeline.ts:419-427`):
```typescript
const originalSegmentId = event.data.segmentId.replace('history_', '');
const combinedId = segmentToCombinedMap.current.get(originalSegmentId) || originalSegmentId;
```

**実際の動作**:
1. `history_seg_123` のような翻訳イベントが到着
2. `segmentToCombinedMap.get('seg_123')` → `undefined`
3. `combinedId = 'seg_123'` （元のセグメントID）
4. 対応する履歴エントリが見つからない
5. 翻訳が適用されない

## 🎯 根本原因

### コア機能の未実装

1. **SentenceCombinerが統合されていない**
   - クラスは作成済み
   - テストも作成済み
   - しかし、実際のパイプラインに組み込まれていない

2. **イベントチェーンが断絶**
   - 型定義は完備
   - ハンドラも準備済み
   - しかし、イベントを発行する側が存在しない

3. **文書と実装の重大な乖離**
   - ドキュメント：「実装済み」
   - 実際：コア部分が未接続

## 📈 影響分析

### 現在の動作（劣化モード）
- 0.8秒ごとの断片的な履歴
- 文の途中で切れる
- 同じ内容が複数エントリに分散
- 「翻訳中...」が永続

### 期待される動作
- 2-3文単位の読みやすい履歴
- 完全な文章単位
- 高品質翻訳の適用
- きれいな表示

## 💡 洞察

これは「小さな接続ミス」ではなく、**アーキテクチャの中核部分が未実装**という深刻な問題です。

### 実装完成度の再評価
- 以前の分析：95%完成
- 実際：約50%完成（コア機能が動作していない）

### なぜ見逃されたか
1. 単体テストは存在し、パスしている
2. 型定義も完備している
3. しかし、統合が行われていない
4. E2Eテストが不足している

## 🔧 必要な対応

これは根本的な実装作業が必要です：

1. UnifiedPipelineServiceにSentenceCombinerを統合
2. 適切なタイミングでCombinedSentenceEventを発行
3. E2Eテストで動作確認
4. ドキュメントを実態に合わせて更新

表面的な修正では解決できない、構造的な問題です。