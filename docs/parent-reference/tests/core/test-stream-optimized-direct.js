// translateTextStreamOptimizedを直接テストしてデバッグ
require('dotenv').config();
const { translateTextStreamOptimized } = require("../helpers/gpt5-helpers-optimized.js");

async function testStreamOptimizedDirect() {
  console.log("=== translateTextStreamOptimized直接テスト ===");
  console.log("日時:", new Date().toISOString());
  
  const text = "Life asks questions.";
  let tokens = [];
  let finalResult = "";
  let firstTokenTime = null;
  const start = Date.now();
  
  console.log(`\n入力: "${text}"`);
  console.log("翻訳開始...");
  
  try {
    const result = await translateTextStreamOptimized({
      srcLang: "en",
      tgtLang: "ja",
      text: text,
      context: "",
      glossary: ["machine learning=>機械学習"],
      onToken: (delta) => {
        if (!firstTokenTime) {
          firstTokenTime = Date.now();
          console.log(`[${firstTokenTime - start}ms] 最初のトークン: "${delta}"`);
        }
        tokens.push(delta);
        console.log(`[${Date.now() - start}ms] トークン: "${delta}"`);
      },
      onDone: (final) => {
        finalResult = final;
        console.log(`[${Date.now() - start}ms] onDone呼び出し: "${final}"`);
      }
    });
    
    console.log("\n=== 結果 ===");
    console.log("返り値:", `"${result}"`);
    console.log("onDoneの結果:", `"${finalResult}"`);
    console.log("総トークン数:", tokens.length);
    console.log("全トークン:", tokens);
    console.log("初期表示時間:", firstTokenTime ? (firstTokenTime - start) + "ms" : "N/A");
    console.log("完了時間:", (Date.now() - start) + "ms");
    
  } catch (error) {
    console.error("❌ エラー:", error.message);
    console.error("スタックトレース:", error.stack);
  }
}

testStreamOptimizedDirect().catch(console.error);