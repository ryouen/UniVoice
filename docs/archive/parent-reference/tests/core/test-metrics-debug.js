// test-metrics-debug.js - デバッグ版メトリクステスト
const { translateTextStreamOptimized } = require("../helpers/gpt5-helpers-optimized.js");

async function debugTranslation() {
  console.log("=== デバッグ版翻訳テスト ===");
  console.log("日時:", new Date().toISOString());
  console.log();

  const text = "Life asks questions.";
  const start = Date.now();
  let firstTokenTime = null;
  let tokens = [];
  let finalResult = "";

  console.log(`入力: "${text}"`);
  console.log("翻訳開始...");

  try {
    await translateTextStreamOptimized({
      srcLang: "en",
      tgtLang: "ja",
      text: text,
      context: "",
      glossary: ["machine learning=>機械学習"],
      onToken: (delta) => {
        if (!firstTokenTime) {
          firstTokenTime = Date.now();
          console.log(`[${(firstTokenTime - start)}ms] 最初のトークン: "${delta}"`);
        }
        tokens.push(delta);
        console.log(`[${(Date.now() - start)}ms] トークン: "${delta}"`);
      },
      onDone: (final) => {
        finalResult = final;
        console.log(`[${(Date.now() - start)}ms] 完了: "${final}"`);
      }
    });

    console.log("\n=== 結果 ===");
    console.log("総トークン数:", tokens.length);
    console.log("全トークン:", tokens);
    console.log("最終結果:", finalResult);
    console.log("初期表示時間:", firstTokenTime ? (firstTokenTime - start) + "ms" : "N/A");
    console.log("完了時間:", (Date.now() - start) + "ms");

  } catch (error) {
    console.error("エラー:", error);
  }
}

debugTranslation().catch(console.error);