/**
 * TranscriptSegment - 音声認識セグメントの基本型定義
 * 
 * YAGNI原則に基づき、実際に使用されているプロパティのみを定義
 * 将来の拡張は必要になったときに行う
 */

export interface TranscriptSegment {
  // 必須プロパティ（全ての使用箇所で必要）
  id: string;              // セグメントの一意識別子
  text: string;            // 音声認識されたテキスト
  timestamp: number;       // 受信時刻（Unix timestamp）
  isFinal: boolean;        // 最終結果かどうか
  
  // オプショナル（一部で使用）
  confidence?: number;     // 信頼度（0.0-1.0）- ASRイベントで使用
  language?: string;       // 言語コード（ISO 639-1）- Phase 3で必要
  
  // Deepgram APIから提供されるが現在未使用
  startMs?: number;        // セグメント開始時刻（ミリ秒）
  endMs?: number;          // セグメント終了時刻（ミリ秒）
}