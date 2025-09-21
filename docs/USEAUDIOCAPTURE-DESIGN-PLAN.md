# useAudioCapture フック設計計画書

## 作成日: 2025-09-21
## 作成者: Senior Engineer (YAGNI原則・Clean Architecture準拠)

## 1. 現状分析

### 問題点
- useUnifiedPipeline.ts（1596行）の中に音声キャプチャロジックが埋め込まれている（1309-1426行）
- 単一責任の原則違反：1つのフックが多すぎる責任を持っている
- 再利用性の欠如：音声キャプチャ機能を他のコンポーネントで使えない
- テスタビリティの低下：巨大なフックのテストが困難

### 現在の実装構造
```typescript
// useUnifiedPipeline.ts内
const audioContextRef = useRef<AudioContext | null>(null);
const mediaStreamRef = useRef<MediaStream | null>(null);
const processorRef = useRef<IAudioProcessor | null>(null);

const startAudioCapture = useCallback(async () => { /* 90行の実装 */ }, []);
const stopAudioCapture = useCallback(() => { /* 26行の実装 */ }, []);
```

## 2. 設計方針

### YAGNI原則の適用
- 現在必要な機能のみを実装する
- 将来の拡張性は考慮するが、実装はしない
- シンプルで理解しやすいインターフェース

### Clean Architecture準拠
- 依存性の方向：UI層 → Application層 → Domain層 → Infrastructure層
- インターフェース（IAudioProcessor）を通じた疎結合
- ビジネスロジックとインフラストラクチャの分離

## 3. インターフェース設計

```typescript
// src/hooks/useAudioCapture.ts

interface UseAudioCaptureOptions {
  enabled?: boolean;  // フックの有効/無効（デフォルト: true）
  onError?: (error: Error) => void;  // エラーハンドラー
  audioConstraints?: MediaStreamConstraints['audio'];  // カスタム音声設定
}

interface UseAudioCaptureReturn {
  // 状態
  isCapturing: boolean;  // キャプチャ中かどうか
  error: Error | null;   // エラー状態
  
  // 制御関数
  startCapture: () => Promise<void>;  // キャプチャ開始
  stopCapture: () => void;             // キャプチャ停止
  
  // デバッグ情報（開発時のみ）
  audioMetrics?: {
    sampleRate: number;
    frameCount: number;
  };
}
```

## 4. 実装計画

### フェーズ1: フック作成
1. `src/hooks/useAudioCapture.ts`を新規作成
2. 必要な型定義とインターフェースの実装
3. 基本的な状態管理の実装

### フェーズ2: ロジック移植
1. useUnifiedPipelineから音声キャプチャロジックを抽出
2. エラーハンドリングの改善
3. リソースクリーンアップの確実な実装

### フェーズ3: 統合
1. useUnifiedPipelineでuseAudioCaptureを使用
2. 既存の機能が正常に動作することを確認
3. 不要になったコードの削除

## 5. 技術的詳細

### 責任範囲
- MediaStreamの取得と管理
- AudioContextの初期化と管理
- AudioWorkletProcessorの作成と制御
- PCM16データのElectronプロセスへの送信
- リソースのクリーンアップ（メモリリーク防止）

### 依存関係
```
useAudioCapture
  ├── AudioWorkletProcessor (Infrastructure)
  ├── IAudioProcessor (Domain Interface)
  └── window.electron.sendAudioChunk (Electron API)
```

### エラーハンドリング
- getUserMedia失敗時の処理
- AudioWorklet読み込み失敗時の処理
- Electron APIが利用できない場合の処理

## 6. 期待される効果

### 即座の効果
- コードの可読性向上（useUnifiedPipelineが約120行削減）
- 単一責任の原則の遵守
- 音声キャプチャ機能の独立性確保

### 将来的な効果
- 音声キャプチャ機能の再利用が可能に
- ユニットテストの記述が容易に
- 機能の拡張や修正が局所化される

## 7. 実装チェックリスト

- [ ] useAudioCapture.tsの作成
- [ ] 型定義とインターフェースの実装
- [ ] MediaStream取得ロジックの実装
- [ ] AudioContext管理の実装
- [ ] AudioWorkletProcessor統合
- [ ] エラーハンドリングの実装
- [ ] リソースクリーンアップの実装
- [ ] useUnifiedPipelineへの統合
- [ ] 動作確認とデバッグ
- [ ] 不要コードの削除

## 8. リスクと対策

### リスク
- 既存機能への影響
- パフォーマンスの劣化

### 対策
- 段階的な移行と検証
- 元のロジックをそのまま移植し、最適化は後回し
- 十分なログ出力による問題の早期発見

---

この設計に基づいて実装を進めることで、Clean Architectureに準拠した保守性の高いコードベースを実現します。