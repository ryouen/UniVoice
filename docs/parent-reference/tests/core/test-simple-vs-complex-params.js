// シンプルなパラメータと複雑なパラメータの比較テスト
require('dotenv').config();
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MODEL_TRANSLATE = process.env.OPENAI_MODEL_TRANSLATE || "gpt-3.5-turbo";

async function testSimpleParams() {
  console.log("=== シンプルパラメータテスト ===");
  
  try {
    const stream = await client.responses.create({
      model: MODEL_TRANSLATE,
      input: [
        { role: "system", content: "Translate English to Japanese." },
        { role: "user", content: "Life asks questions." }
      ],
      max_output_tokens: 128,
      stream: true
    });
    
    let eventCount = 0;
    let deltaCount = 0;
    let acc = "";
    let hasCompleted = false;
    
    for await (const ev of stream) {
      eventCount++;
      console.log(`イベント${eventCount}: ${ev.type}`);
      
      if (ev.type === "response.output_text.delta") {
        deltaCount++;
        acc += ev.delta;
        console.log(`  デルタ${deltaCount}: "${ev.delta}"`);
      } else if (ev.type === "response.completed") {
        hasCompleted = true;
        console.log("  → 完了イベント！");
      } else if (ev.type === "response.incomplete") {
        console.log("  → 不完全イベント");
      }
    }
    
    console.log("結果:");
    console.log("- 総イベント数:", eventCount);
    console.log("- デルタ数:", deltaCount);
    console.log("- 完了:", hasCompleted);
    console.log("- テキスト:", `"${acc}"`);
    
  } catch (error) {
    console.error("❌ シンプルパラメータエラー:", error.message);
  }
}

async function testComplexParams() {
  console.log("\n=== 複雑パラメータテスト ===");
  
  const sys = "You are a translator. Translate from en to ja. Keep terms as-is unless mapping is provided.";
  const usr = [
    "Glossary: machine learning=>機械学習",
    "Text: Life asks questions."
  ].join("\n");
  
  console.log("System:", sys);
  console.log("User:", usr);
  
  try {
    const requestParams = {
      model: MODEL_TRANSLATE,
      input: [{ role: "system", content: sys }, { role: "user", content: usr }],
      max_output_tokens: 128,
      stream: true
    };
    
    if (MODEL_TRANSLATE.includes('gpt-5')) {
      requestParams.reasoning = { effort: "low" };
    }
    
    const stream = await client.responses.create(requestParams);
    
    let eventCount = 0;
    let deltaCount = 0;
    let acc = "";
    let hasCompleted = false;
    
    for await (const ev of stream) {
      eventCount++;
      console.log(`イベント${eventCount}: ${ev.type}`);
      
      if (ev.type === "response.output_text.delta") {
        deltaCount++;
        acc += ev.delta;
        console.log(`  デルタ${deltaCount}: "${ev.delta}"`);
      } else if (ev.type === "response.completed") {
        hasCompleted = true;
        console.log("  → 完了イベント！");
      } else if (ev.type === "response.incomplete") {
        console.log("  → 不完全イベント");
      }
    }
    
    console.log("結果:");
    console.log("- 総イベント数:", eventCount);
    console.log("- デルタ数:", deltaCount);
    console.log("- 完了:", hasCompleted);
    console.log("- テキスト:", `"${acc}"`);
    
  } catch (error) {
    console.error("❌ 複雑パラメータエラー:", error.message);
  }
}

async function runComparison() {
  await testSimpleParams();
  await testComplexParams();
}

runComparison().catch(console.error);