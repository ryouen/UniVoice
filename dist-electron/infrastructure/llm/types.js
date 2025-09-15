"use strict";
/**
 * LLM Gateway 型定義
 *
 * ⚠️ 重要: これらの型は既存の実装に影響を与えない
 * 新しい抽象化レイヤーのための型定義のみ
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMPurpose = void 0;
/**
 * LLMの用途を定義
 * 既存のモデル設定と1:1で対応
 */
var LLMPurpose;
(function (LLMPurpose) {
    LLMPurpose["TRANSLATION"] = "translation";
    LLMPurpose["SUMMARY"] = "summary";
    LLMPurpose["SUMMARY_TRANSLATE"] = "summary_translate";
    LLMPurpose["USER_TRANSLATE"] = "user_translate";
    LLMPurpose["VOCABULARY"] = "vocabulary";
    LLMPurpose["REPORT"] = "report"; // gpt-5
})(LLMPurpose || (exports.LLMPurpose = LLMPurpose = {}));
