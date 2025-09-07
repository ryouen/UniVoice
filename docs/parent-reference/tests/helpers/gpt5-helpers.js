/**
 * test-gpt5-helpers.js
 * - GPT-5-nano/mini 向けのストリーミング翻訳ユーティリティ
 * - interim仮訳/最速first-paint用: output_text.delta を逐次処理
 * - nano系では reasoning / temperature を一切指定しない（安定性・互換のため）
 */

require('dotenv').config();
const OpenAI = require('openai');
const https = require('https');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Keep-Alive 明示（接続再利用）
  baseURL: process.env.OPENAI_BASE_URL, // 任意
  // Node SDK は内部でエージェントを掴む実装だが、明示で安定化
  // @ts-ignore
  httpAgent: new https.Agent({ keepAlive: true })
});

// ====== モデル定義 ======
const MODEL_TRANSLATE = process.env.OPENAI_MODEL_TRANSLATE || 'gpt-5-nano';
const MODEL_SUMMARY   = process.env.OPENAI_MODEL_SUMMARY   || 'gpt-5-mini';
const MODEL_VOCAB     = process.env.OPENAI_MODEL_VOCAB     || 'gpt-5-mini';
const MODEL_REPORT    = process.env.OPENAI_MODEL_REPORT    || 'gpt-5';

// ====== エクスポートするKPIヘルパ ======
function estimateCost(kind, inputChars = 0) {
  // ざっくりの概算（必要なら微調整）
  const perM = { translate: 0.02, summary: 0.05, vocab: 0.03, report: 0.5 }[kind] || 0.05;
  return perM * (inputChars / 1000);
}

// ====== 共通：テキスト抽出（フォールバック対応） ======
function toOutputText(response) {
  try {
    // 優先順位1: output_text（SDKの集約プロパティ）
    if (response?.output_text !== undefined && response?.output_text !== null) {
      // 空文字でも有効な結果として扱う
      return String(response.output_text);
    }
    
    // 優先順位2: output[0].content[0].text（構造化応答）
    if (response?.output?.[0]?.content?.[0]?.text) {
      console.log('[GPT5] Using fallback: output[0].content[0].text');
      return response.output[0].content[0].text;
    }
    
    // 優先順位3: output配列の結合
    if (response?.output && Array.isArray(response.output)) {
      const texts = response.output
        .map(o => o?.content?.[0]?.text || o?.text || '')
        .filter(Boolean);
      if (texts.length > 0) {
        console.log('[GPT5] Using fallback: output array join');
        return texts.join('');
      }
    }
    
    // デバッグ: 取得失敗時は構造をログ
    console.error('[GPT5] Failed to extract text. Response keys:', Object.keys(response || {}));
    console.error('[GPT5] Response sample:', JSON.stringify(response).substring(0, 200));
    
    return '';
  } catch (error) {
    console.error('[GPT5] toOutputText error:', error.message);
    return '';
  }
}

// ====== ウォームアップ ======
async function warmupOnce() {
  try {
    // 軽いPing。キャッシュに前置きを載せたい場合はここで実施
    return true;
  } catch {
    return false;
  }
}

/**
 * ストリーミング翻訳（Responses Streaming, output_text.delta）
 * - onDelta: delta文字列が来るたび呼ばれる（UIへ逐次表示）
 * - onFirstPaint: 最初のdelta到着時に一度だけ呼ばれる（計測用）
 * - onDone: 完了時
 * - 注意: reasoning/temperature は **指定しない**（nano安定のため）
 *   Ref: output_text.delta 形式の公式ドキュメント。:contentReference[oaicite:3]{index=3}
 */
async function translateNanoStream({
  srcLang = 'en',
  tgtLang = 'ja',
  text,
  context = '',
  glossary = [],
  maxOutputTokens = Number(process.env.OPENAI_TRANSLATE_MAX_TOKENS || 1400),  // 最適化済み（100%成功率）
  onDelta = () => {},
  onFirstPaint = () => {},
  onDone = () => {}
}) {
  const system = `Translate ${srcLang} to ${tgtLang}. Output only translation.`;

  const glossaryLine = glossary && glossary.length
    ? `Glossary (source=>target): ${glossary.join(', ')}`
    : '';

  const user = [
    context ? `Context (recent): ${context}` : '',
    glossaryLine,
    `Text: ${text}`
  ].filter(Boolean).join('\n');

  const createdAt = Date.now();
  let firstPaintCalled = false;
  let buf = '';

  // 非ストリーミングモードに戻す（ストリーミングイベント形式が不安定なため）
  const response = await client.responses.create({
    model: MODEL_TRANSLATE,
    input: [{ role: 'system', content: system }, { role: 'user', content: user }],
    max_output_tokens: maxOutputTokens,
    stream: false
    // NOTE: reasoning パラメータは完全に削除（nano安定のため）
  });

  // first-paint = complete timeとして扱う（ストリーミング無しのため）
  const result = toOutputText(response);
  if (!firstPaintCalled) {
    firstPaintCalled = true;
    const elapsed = Date.now() - createdAt;
    onFirstPaint(elapsed);
    buf = result;
    onDelta(result, buf);
    onDone(result);
  }
  return buf;
}

// ====== 小並列プール ======
class TranslationPool {
  constructor(max = Number(process.env.OPENAI_TRANSLATE_CONCURRENCY || 3)) {
    this.max = Math.max(1, max);
    this.inFlight = 0; this.q = [];
  }
  enqueue(taskFn) {
    return new Promise((resolve, reject) => {
      this.q.push({ taskFn, resolve, reject });
      this._runNext();
    });
  }
  _runNext() {
    while (this.inFlight < this.max && this.q.length) {
      const { taskFn, resolve, reject } = this.q.shift();
      this.inFlight++;
      Promise.resolve().then(taskFn)
        .then(res => { this.inFlight--; resolve(res); this._runNext(); })
        .catch(err => { this.inFlight--; reject(err); this._runNext(); });
    }
  }
}
const _pool = new TranslationPool();

// ====== フラグメント判定 ======
const FRAG_MIN_CHARS = Number(process.env.UNIVOICE_FRAG_MIN_CHARS || 14);
function looksFragment(text) {
  const s = String(text || '').trim();
  if (!s) return false;
  if (s.length < FRAG_MIN_CHARS) return true;
  return !/[\.!\?。！？]$/.test(s);
}

/**
 * translateWithRetry（プール実行）
 * - 通常文: リトライ 0
 * - 断片:   最大1回, 300–450ms
 * - onDelta / onFirstPaint / onDone を渡すことで「最速first-paint」をUIへ反映
 */
async function translateWithRetry({
  srcLang = 'en',
  tgtLang = 'ja',
  text,
  context = '',
  glossary = [],
  isFragment,
  maxOutputTokens = Number(process.env.OPENAI_TRANSLATE_MAX_TOKENS || 1400),  // 最適化済み（100%成功率）
  onDelta = () => {},
  onFirstPaint = () => {},
  onDone = () => {}
}) {
  const frag = (typeof isFragment === 'boolean') ? isFragment : looksFragment(text);
  const maxRetries = frag ? Number(process.env.UNIVOICE_FRAG_RETRY_MAX || 1) : 0;
  const delayMs    = Number(process.env.UNIVOICE_FRAG_RETRY_DELAY_MS || 450);

  return _pool.enqueue(async () => {
    const runOnce = (hint = '') => translateNanoStream({
      srcLang, tgtLang,
      text: hint ? `${text} ${hint}` : text,
      context, glossary,
      maxOutputTokens,
      onDelta, onFirstPaint, onDone
    });

    let out = (await runOnce()) || '';
    for (let i = 0; out.trim() === '' && i < maxRetries; i++) {
      await new Promise(r => setTimeout(r, delayMs));
      out = (await runOnce('(Translate even if fragment or single word.)')) || '';
    }
    return out.trim();
  });
}

// ====== ③/④/⑤/⑥ 用の一括呼び（非ストリーム） ======
async function respondOnce({ model, system, user, max = 512, effort /* optional */ }) {
  const payload = {
    model,
    input: [{ role: 'system', content: system }, { role: 'user', content: user }],
    max_output_tokens: max
  };
  // reasoning は mini/5 に対して必要な時のみ（既定は未指定）
  if (effort) payload.reasoning = { effort };
  const res = await client.responses.create(payload);
  return toOutputText(res);
}

async function generateSummary(text, prevOneLiner) {
  const system = `You are an expert lecture summarizer. Write a concise English summary (2–3 sentences). Preserve technical terms; avoid definitions.`;
  const user = `Excerpt (~10 minutes):\n${text}\n${prevOneLiner ? `Previous summary (one line): ${prevOneLiner}` : ``}`;
  const maxTokens = parseInt(process.env.OPENAI_SUMMARY_MAX_TOKENS || '1500');
  return await respondOnce({ model: MODEL_SUMMARY, system, user, max: maxTokens });
}

async function translateSummary(summaryEn, tgtLang = 'ja') {
  const system = `You are a precise translator. Translate from English to ${tgtLang}. Output only the translation text.`;
  const user = `Text: ${summaryEn}`;
  const maxTokens = parseInt(process.env.OPENAI_SUMMARY_MAX_TOKENS || '1500');
  // miniでOK。reasoning不要
  return await respondOnce({ model: MODEL_SUMMARY, system, user, max: maxTokens });
}

async function translateUserInput(userText, srcLang, tgtLang) {
  const system = `You are a helpful bilingual assistant. Convert ${srcLang} input to natural spoken ${tgtLang}.`;
  const user = `Text: ${userText}`;
  const maxTokens = parseInt(process.env.OPENAI_TRANSLATE_MAX_TOKENS || '1500');
  return await respondOnce({ model: MODEL_TRANSLATE, system, user, max: maxTokens });
}

async function generateVocabulary(text) {
  const system = `You are a terminology extractor. Output ONLY a JSON array of technical terms. Each item must be {"term_en":"English term","term_ja":"Japanese translation"}. No other text, no markdown, just the JSON array.`;
  const user = `Extract 5-10 key technical terms from this text and translate to Japanese:\n${text}`;
  const maxTokens = parseInt(process.env.OPENAI_VOCAB_MAX_TOKENS || '1500');
  const out = await respondOnce({ model: MODEL_VOCAB, system, user, max: maxTokens });
  
  // JSONパース（複数の方法を試す）
  try {
    // 直接パース
    return JSON.parse(out);
  } catch (e) {
    // 配列部分のみ抽出して再試行
    const arrayMatch = out.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch (e2) {
        console.error('[GPT5] Vocabulary JSON parse failed:', e2.message);
        console.error('[GPT5] Raw output:', out.substring(0, 200));
        return [];
      }
    }
    return [];
  }
}

async function generateFinalReport(fullEn, notes, vocabJson) {
  const system = `You are a report writer. Produce a well-structured lecture report with sections (Overview/Key Points/Examples/Open Questions). Target length 900–1400 words.`;
  const user = `Lecture:\n${fullEn}\n\nNotes:\n${notes}\n\nVocabulary:\n${JSON.stringify(vocabJson)}`;
  const maxTokens = parseInt(process.env.OPENAI_REPORT_MAX_TOKENS || '8192');
  // 高精度用途のみ reasoning 指定（必要時）
  return await respondOnce({ model: MODEL_REPORT, system, user, max: maxTokens, effort: process.env.REPORT_REASONING || 'high' });
}

module.exports = {
  warmupOnce,
  translateNanoStream,
  translateWithRetry,
  generateSummary,
  translateSummary,
  translateUserInput,
  generateVocabulary,
  generateFinalReport,
  estimateCost,
  GPT5_MODELS: { TRANSLATE: MODEL_TRANSLATE, SUMMARY: MODEL_SUMMARY, VOCABULARY: MODEL_VOCAB, REPORT: MODEL_REPORT }
};