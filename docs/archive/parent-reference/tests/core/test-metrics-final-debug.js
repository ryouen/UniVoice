// test-metrics.jsの詳細デバッグ版
const { translateTextStreamOptimized } = require("../helpers/gpt5-helpers-optimized.js");
const { GPT5_MODELS } = require("../helpers/gpt5-helpers.js");

async function measureOneTranslationDebug({ input, context = "", glossary = [] }) {
  console.log(`\n=== 翻訳開始: "${input}" ===`);
  
  const start = Date.now();
  let firstDeltaAt = null;
  let finalAt = null;
  let full = "";
  let tokenCount = 0;
  let onDoneCalled = false;
  
  console.log("translateTextStreamOptimized呼び出し開始...");

  try {
    await translateTextStreamOptimized({
      srcLang: "en",
      tgtLang: "ja",
      text: input,
      context,
      glossary,
      onToken: (delta) => {
        tokenCount++;
        if (!firstDeltaAt) {
          firstDeltaAt = Date.now();
          console.log(`  初回トークン受信: "${delta}" (${firstDeltaAt - start}ms)`);
        }
        console.log(`  トークン${tokenCount}: "${delta}"`);
      },
      onDone: (final) => {
        onDoneCalled = true;
        full = String(final || "").trim();
        finalAt = Date.now();
        console.log(`  onDone呼び出し: "${final}" (${finalAt - start}ms)`);
        console.log(`  処理後のfull: "${full}"`);
      }
    });
  } catch (error) {
    console.error("  ❌ translateTextStreamOptimizedエラー:", error.message);
    throw error;
  }

  const result = {
    text: full,
    firstPaint: (firstDeltaAt || finalAt || Date.now()) - start,
    complete: (finalAt || Date.now()) - start,
    model: GPT5_MODELS.TRANSLATE,
    tokenCount,
    onDoneCalled
  };
  
  console.log("=== 翻訳結果 ===");
  console.log("  text:", `"${result.text}"`);
  console.log("  firstPaint:", result.firstPaint + "ms");
  console.log("  complete:", result.complete + "ms");
  console.log("  tokenCount:", result.tokenCount);
  console.log("  onDoneCalled:", result.onDoneCalled);
  
  return result;
}

async function runDebugTest() {
  console.log("=== メトリクス詳細デバッグテスト ===");
  console.log("日時:", new Date().toISOString());
  
  // シンプルなテストから開始
  const testCases = [
    {
      input: "Life asks questions.",
      context: ""
    },
    {
      input: "Machine learning is transforming the world.",
      context: "Technology has evolved rapidly."
    }
  ];
  
  const fixedGlossary = [
    "machine learning=>機械学習",
    "algorithm=>アルゴリズム"
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n🔄 テストケース${i+1}/${testCases.length}`);
    
    try {
      const result = await measureOneTranslationDebug({
        input: testCase.input,
        context: testCase.context,
        glossary: fixedGlossary
      });
      
      console.log(`✅ テストケース${i+1}完了`);
      
    } catch (error) {
      console.error(`❌ テストケース${i+1}失敗:`, error.message);
    }
  }
}

runDebugTest().catch(console.error);