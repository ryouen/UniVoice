// test-gpt5-detailed-metrics.js
// ② 翻訳ストリームの性能計測に特化した新ファイル
const { translateTextStreamOptimized } = require("../helpers/gpt5-helpers-optimized.js");
const { GPT5_MODELS } = require("../helpers/gpt5-helpers.js");

/**
 * 単一文の翻訳計測（初期表示 + 完了時間）
 * @param {Object} params
 * @param {string} params.input 翻訳対象文
 * @param {string} [params.context] 前後文脈（短い）
 * @param {string[]} [params.glossary] グロッサリ項目
 * @returns {Promise<{text:string, firstPaint:number, complete:number, model:string}>}
 */
async function measureOneTranslation({ input, context = "", glossary = [] }) {
  const start = Date.now();
  let firstDeltaAt = null;
  let finalAt = null;
  let full = "";

  await translateTextStreamOptimized({
    srcLang: "en",
    tgtLang: "ja",
    text: input,
    context,
    glossary,
    onToken: (delta) => {
      if (!firstDeltaAt) firstDeltaAt = Date.now();
    },
    onDone: (final) => {
      full = String(final || "").trim();
      finalAt = Date.now();
    }
  });

  return {
    text: full,
    firstPaint: (firstDeltaAt || finalAt || Date.now()) - start,
    complete: (finalAt || Date.now()) - start,
    model: GPT5_MODELS.TRANSLATE
  };
}

/**
 * 複数文に継いで翻訳し、結果をresults.translation配列に記録
 * @param {Object} params
 * @param {Array<{input:string, context?:string}>} params.samples
 * @param {Object} params.results 計測結果格納オブジェクト
 */
async function runTranslationBench({ samples, results }) {
  results.translation = results.translation || [];

  const fixedGlossary = [
    "machine learning=>機械学習",
    "supervised learning=>教師あり学習",
    "neural networks=>ニューラルネットワーク",
    "algorithm=>アルゴリズム"
  ];

  for (const s of samples) {
    const contextShort = (s.context || "")
      .split(/\s+/)
      .slice(-80)
      .join(" ");

    const r = await measureOneTranslation({
      input: s.input,
      context: contextShort,
      glossary: fixedGlossary
    });

    results.translation.push({
      input: s.input,
      output: r.text,
      firstPaint: r.firstPaint,
      responseTime: r.complete,
      model: r.model,
      hasContext: !!contextShort
    });

    console.log(
      `② 翻訳: "${s.input}" → 初期表示: ${r.firstPaint}ms / 完了: ${r.complete}ms`
    );
  }
}

/**
 * 結果をまとめて表示
 * @param {Object} results 翻訳計測結果格納オブジェクト
 */
function printTranslationSummary(results) {
  const arr = results.translation || [];
  console.log("\n=== 翻訳ベンチマーク要約 ===");
  console.log(`サンプル数: ${arr.length}`);

  if (arr.length === 0) {
    console.log(" → 計測結果なし");
    return;
  }

  const sumFirst = arr.reduce((acc, cur) => acc + cur.firstPaint, 0);
  const sumComplete = arr.reduce((acc, cur) => acc + cur.responseTime, 0);

  const avgFirst = Math.round(sumFirst / arr.length);
  const avgComplete = Math.round(sumComplete / arr.length);
  const allWithin1s = arr.every((r) => r.firstPaint <= 1000);

  console.log(`平均 初期表示: ${avgFirst}ms`);
  console.log(`平均 完了時間: ${avgComplete}ms`);
  console.log(`初期表示 ≤ 1000ms 達成率: ${allWithin1s ? "100%（✅）" : "未達（❌）"}`);
}

module.exports = {
  measureOneTranslation,
  runTranslationBench,
  printTranslationSummary
};

// 直接実行された場合のテストコード
if (require.main === module) {
  const test = async () => {
    console.log("=== UniVoice 翻訳メトリクステスト ===");
    console.log("日時:", new Date().toISOString());
    console.log();

    const results = {};
    
    // テストサンプル
    const samples = [
      { 
        input: "Life asks questions.",
        context: ""
      },
      { 
        input: "Machine learning is transforming how we understand and interact with the world.",
        context: "Technology has evolved rapidly."
      },
      { 
        input: "The neural networks learn from data through supervised learning algorithms.",
        context: "Machine learning is a field of artificial intelligence."
      },
      { 
        input: "What are you going to do about the difficult thoughts and feelings?",
        context: "Life asks questions. And perhaps one of the most important ones is this."
      },
      { 
        input: "If you're standing here about to start giving a TED Talk and your mind is getting unsettled.",
        context: "Life just asked you a question."
      }
    ];

    // ベンチマーク実行
    await runTranslationBench({ samples, results });
    
    // 結果表示
    printTranslationSummary(results);
    
    // 詳細結果
    console.log("\n=== 詳細結果 ===");
    results.translation.forEach((r, i) => {
      console.log(`\n[${i+1}] ${r.input}`);
      console.log(`  → ${r.output}`);
      console.log(`  初期表示: ${r.firstPaint}ms, 完了: ${r.responseTime}ms`);
    });
  };

  test().catch(console.error);
}
