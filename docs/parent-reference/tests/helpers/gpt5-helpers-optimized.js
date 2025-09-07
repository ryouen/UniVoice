#!/usr/bin/env node
// GPT-5 Helper Functions - 最適化版（コンテキスト短縮・System最小化・Keep-Alive）

const https = require('https');
const OpenAI = require("openai");

// Keep-Alive Agent設定（接続再利用）
const agent = new https.Agent({ 
  keepAlive: true, 
  maxSockets: 50,
  keepAliveMsecs: 1000
});

// 固定モデル
const MODEL_TRANSLATE = process.env.OPENAI_MODEL_TRANSLATE || "gpt-5-nano";
const MODEL_SUMMARY   = process.env.OPENAI_MODEL_SUMMARY   || "gpt-5-mini";
const MODEL_VOCAB     = process.env.OPENAI_MODEL_VOCAB     || "gpt-5-mini";
const MODEL_REPORT    = process.env.OPENAI_MODEL_REPORT    || "gpt-5";

// OpenAIクライアント（Keep-Alive適用）
const client = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  httpAgent: agent
});

// --- System構築関数（最小版と標準版） ---
function buildSystemMinimal() {
  return `You are a translator. Translate from en to ja. Keep terms as-is unless mapping is provided.`;
}

function buildSystemStandard(src, tgt, glossary = []) {
  const gloss = (glossary || []).slice(0, 15).join(", ");
  return [
    `You are a real-time subtitle translator for university lectures.`,
    `Translate from ${src} to ${tgt}.`,
    `Keep technical terms and proper nouns as-is, or use the provided mapping.`,
    `Use concise, neutral caption style. Add punctuation. No meta text.`,
    gloss ? `Glossary (keep/mapping): ${gloss}` : ``
  ].filter(Boolean).join("\n");
}

function toOutputText(r) {
  return (r && r.output_text ? String(r.output_text).trim() : "");
}

async function warmupOnce() {
  try {
    await client.responses.create({ 
      model: MODEL_TRANSLATE, 
      input: "ok", 
      max_output_tokens: 1,
      reasoning: { effort: "low" }
    });
  } catch {}
}

// --- ② 翻訳（ストリーミング最適化版） ---
async function translateTextStreamOptimized({ 
  srcLang, 
  tgtLang, 
  text, 
  context, 
  glossary, 
  onToken, 
  onDone,
  contextWords = 40,  // コンテキスト語数（調整可能）
  useMinimalSystem = true  // System最小化フラグ
}) {
  // シンプルで確実な実装に変更
  const sys = "Translate English to Japanese. Output only the translation.";
  const usr = text;

  const requestParams = {
    model: MODEL_TRANSLATE,
    input: [{ role: "system", content: sys }, { role: "user", content: usr }],
    max_output_tokens: 128,
    stream: true
  };
  
  // GPT-5系のモデルの場合のみreasoningを追加
  if (MODEL_TRANSLATE.includes('gpt-5')) {
    requestParams.reasoning = { effort: "low" };
  }
  
  const stream = await client.responses.create(requestParams);

  let acc = "";
  for await (const ev of stream) {
    if (ev.type === "response.output_text.delta") {
      acc += ev.delta;
      if (onToken) {
        onToken(ev.delta);
      }
    } else if (ev.type === "response.completed") {
      if (onDone) {
        onDone(acc.trim());
      }
    }
  }
  return acc.trim();
}

// 標準版（後方互換性）
async function translateTextStream(opts) {
  return translateTextStreamOptimized({
    ...opts,
    contextWords: 80,
    useMinimalSystem: false
  });
}

// 非ストリーム版
async function respondOnce({ model, system, user, effort = "low", max = 512 }) {
  // GPT-5系モデルのみreasoningパラメータをサポート
  const requestParams = {
    model,
    input: [{ role: "system", content: system }, { role: "user", content: user }],
    max_output_tokens: max
  };
  
  // GPT-5系のモデルの場合のみreasoningを追加
  if (model.includes('gpt-5')) {
    requestParams.reasoning = { effort };
  }
  
  const res = await client.responses.create(requestParams);
  return toOutputText(res);
}

// ③要約
async function generateSummary(text, previousSummary) {
  const system = `You are an expert lecture summarizer. Write a 2–3 sentence English summary. Preserve technical terms; avoid speculation and definitions of basics.`;
  const user = `Excerpt (~10 minutes):\n${text}\n${previousSummary ? `Previous summary (one line): ${previousSummary}` : ``}`;
  return await respondOnce({ model: MODEL_SUMMARY, system, user, effort: "low", max: 180 });
}

// ④要約翻訳
async function translateSummary(summaryText, tgtLang = "ja") {
  const sys = buildSystemMinimal();
  const usr = `Text: ${summaryText}`;
  return await respondOnce({ model: MODEL_TRANSLATE, system: sys, user: usr, max: 256 });
}

// ④ユーザー入力
async function translateUserInput(japaneseText) {
  const sys = `You are a translator. Translate from ja to en.`;
  const usr = `Text: ${japaneseText}`;
  return await respondOnce({ model: MODEL_TRANSLATE, system: sys, user: usr, max: 256 });
}

// ⑤語彙生成
async function generateVocabulary(summariesText, tgtLang = "ja") {
  const system = `Extract 8–12 domain-specific terms discussed in the lecture. Output ONLY valid JSON array in this format (no code fences): [{"term":"...","translation":"...","definition_${tgtLang}":"..."}]`;
  const user = `Lecture summaries (chronological):\n${summariesText}`;
  const out = await respondOnce({ model: MODEL_VOCAB, system, user, effort: "low", max: 800 });

  const m = out.match(/\[[\s\S]*\]$/m);
  if (!m) return [];
  try { return JSON.parse(m[0]); }
  catch { return []; }
}

// ⑥最終レポート
async function generateFinalReport(allSummaries, studentNotes, glossaryJson) {
  const system = `Write a well-structured lecture report in English using Markdown. Sections: Overview, Topics, Key Points, Q&A (if any), Conclusion. Be accurate and faithful; keep terms consistent with the glossary. Target length: 900–1400 words.`;
  const user = `Summaries:\n${allSummaries}\n\nStudent notes:\n${studentNotes || ""}\n\nGlossary (JSON):\n${JSON.stringify(glossaryJson || [], null, 2)}`;
  return await respondOnce({ model: MODEL_REPORT, system, user, effort: "high", max: 2200 });
}

function estimateCost(operation, tokenCount) {
  const map = { translate: MODEL_TRANSLATE, summary: MODEL_SUMMARY, vocabulary: MODEL_VOCAB, report: MODEL_REPORT };
  const m = map[operation] || MODEL_REPORT;
  const perTok = m === "gpt-5-nano" ? 0.000001 : m === "gpt-5-mini" ? 0.000002 : 0.000005;
  return perTok * tokenCount;
}

module.exports = {
  warmupOnce,
  translateTextStream,
  translateTextStreamOptimized,
  generateSummary,
  translateSummary,
  translateUserInput,
  generateVocabulary,
  generateFinalReport,
  estimateCost,
  GPT5_MODELS: { TRANSLATE: MODEL_TRANSLATE, SUMMARY: MODEL_SUMMARY, VOCABULARY: MODEL_VOCAB, REPORT: MODEL_REPORT }
};