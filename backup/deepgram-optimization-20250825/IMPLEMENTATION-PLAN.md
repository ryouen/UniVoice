# Deepgram Optimization Implementation Plan

## Overview
Clean Architecture準拠のDeepgram最適化を段階的に実装します。

## Current vs Recommended Settings

| Parameter | Current | Recommended | Reason |
|-----------|---------|-------------|--------|
| endpointing | 800ms | 300ms | より早い反応性 |
| utterance_end_ms | 1000ms | 1200ms | より自然な発話区切り |
| smart_format | false | true | 可読性向上（句読点・段落含む） |
| punctuate | false | false | smart_formatに含まれる |
| no_delay | N/A | false | 品質優先（3秒待ちを許容） |

## Implementation Stages

### Stage 0: Environment Variable Setup (今回実装)
- 新しい環境変数を追加
- 既存のコードを保持（コメントで元の値を記録）
- リスク: 最小（既存動作に影響なし）

### Stage 1: DeepgramStreamAdapter Implementation
- Clean Architectureに準拠したAdapter実装
- UtteranceEndイベントのサポート
- SessionClockによる時刻管理
- リスク: 中（新規コードのため既存への影響は限定的）

### Stage 2: Domain Event Migration
- UIをドメインイベント購読に切り替え
- 旧経路との並行運用
- リスク: 高（UI層の変更）

### Stage 3: Translation Queue Optimization
- Port/Adapter パターンで再実装
- 指数バックオフの実装
- リスク: 中

## Rollback Strategy
1. 環境変数を元に戻す
2. バックアップからファイルを復元
3. npm run build && npm run electron で確認

## Testing Checklist
- [ ] TypeScript compilation
- [ ] Build success
- [ ] Basic transcription
- [ ] Smart format output
- [ ] UtteranceEnd events (Stage 1+)
- [ ] UI responsiveness

## Files Modified
1. `.env.example` - 新環境変数の追加
2. `electron/main.ts` - 環境変数の読み込み
3. `electron/services/domain/UnifiedPipelineService.ts` - URLパラメータ追加

---
Created: 2025-08-25
Author: Claude Code with Ultrathinking