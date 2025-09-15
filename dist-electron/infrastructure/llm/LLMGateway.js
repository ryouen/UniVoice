"use strict";
/**
 * LLM Gateway インターフェース
 *
 * すべてのLLM通信を抽象化する統一インターフェース
 *
 * ⚠️ 実装時の注意:
 * - 現在はOpenAI Responses APIを使用（GPT-5シリーズ）
 * - モデル名、API呼び出し方法は変更禁止
 * - このインターフェースは既存コードに影響しない
 */
Object.defineProperty(exports, "__esModule", { value: true });
