// 詳細デバッグ版テスト - responses APIを直接使用
require('dotenv').config();
const OpenAI = require('openai');

async function detailedDebugTest() {
  console.log("=== 詳細デバッグテスト（直接responses API使用） ===");
  console.log("日時:", new Date().toISOString());
  
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  const text = "Life asks questions.";
  const model = process.env.OPENAI_MODEL_TRANSLATE || 'gpt-3.5-turbo';
  
  console.log("\n設定:");
  console.log("- 入力テキスト:", text);
  console.log("- モデル:", model);
  console.log("- APIキー設定:", process.env.OPENAI_API_KEY ? "✅" : "❌");
  
  try {
    // まず非ストリーミング版で動作確認
    console.log("\n=== 非ストリーミング版テスト ===");
    const response = await client.responses.create({
      model: model,
      input: [
        { role: "system", content: "Translate English to Japanese. Output only the translation." },
        { role: "user", content: text }
      ],
      max_output_tokens: 128
    });
    
    console.log("レスポンス構造:");
    console.log("- status:", response.status);
    console.log("- output_text:", response.output_text);
    console.log("- output配列長:", response.output ? response.output.length : "undefined");
    
    if (response.output && response.output[0]) {
      console.log("- output[0].content:", response.output[0].content);
    }
    
    console.log("\n=== ストリーミング版テスト ===");
    const start = Date.now();
    let eventCount = 0;
    let deltaCount = 0;
    let accumulator = "";
    
    const stream = await client.responses.create({
      model: model,
      input: [
        { role: "system", content: "Translate English to Japanese. Output only the translation." },
        { role: "user", content: text }
      ],
      max_output_tokens: 128,
      stream: true
    });
    
    console.log("ストリーム開始...");
    
    for await (const chunk of stream) {
      eventCount++;
      console.log(`[${Date.now() - start}ms] イベント${eventCount}: ${chunk.type}`);
      
      if (chunk.type === "response.output_text.delta") {
        deltaCount++;
        console.log(`  → デルタ${deltaCount}: "${chunk.delta}"`);
        accumulator += chunk.delta;
      } else if (chunk.type === "response.completed") {
        console.log("  → 完了");
      } else {
        console.log(`  → その他: ${JSON.stringify(chunk).substring(0, 100)}`);
      }
    }
    
    console.log("\n=== 結果 ===");
    console.log("総イベント数:", eventCount);
    console.log("デルタ数:", deltaCount);
    console.log("蓄積されたテキスト:", `"${accumulator}"`);
    console.log("所要時間:", Date.now() - start, "ms");
    
  } catch (error) {
    console.error("❌ エラー:", error.message);
    console.error("エラー詳細:", error);
  }
}

detailedDebugTest().catch(console.error);