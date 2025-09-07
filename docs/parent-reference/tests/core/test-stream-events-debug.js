// ストリームイベントの詳細デバッグ
require('dotenv').config();
const OpenAI = require('openai');

async function testStreamEventsDebug() {
  console.log("=== ストリームイベント詳細デバッグ ===");
  
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  const model = process.env.OPENAI_MODEL_TRANSLATE || "gpt-3.5-turbo";
  const text = "Life asks questions.";
  
  console.log("モデル:", model);
  console.log("入力:", text);
  
  // reasoning付きでテスト
  try {
    console.log("\n=== reasoning付きテスト ===");
    const stream = await client.responses.create({
      model: model,
      input: [
        { role: "system", content: "Translate English to Japanese. Output only the translation." },
        { role: "user", content: text }
      ],
      reasoning: { effort: "low" },
      max_output_tokens: 128,
      stream: true
    });
    
    let eventCount = 0;
    let deltaCount = 0;
    let hasCompleted = false;
    
    for await (const chunk of stream) {
      eventCount++;
      console.log(`イベント${eventCount}: ${chunk.type}`);
      
      if (chunk.type === "response.output_text.delta") {
        deltaCount++;
        console.log(`  デルタ${deltaCount}: "${chunk.delta}"`);
      } else if (chunk.type === "response.completed") {
        hasCompleted = true;
        console.log("  → 完了イベント検出!");
      }
    }
    
    console.log("総イベント数:", eventCount);
    console.log("デルタ数:", deltaCount);
    console.log("完了イベント:", hasCompleted ? "✅" : "❌");
    
  } catch (error) {
    console.error("❌ reasoning付きエラー:", error.message);
    
    // reasoning無しでテスト
    console.log("\n=== reasoning無しテスト ===");
    try {
      const stream = await client.responses.create({
        model: model,
        input: [
          { role: "system", content: "Translate English to Japanese. Output only the translation." },
          { role: "user", content: text }
        ],
        max_output_tokens: 128,
        stream: true
      });
      
      let eventCount = 0;
      let deltaCount = 0;
      let hasCompleted = false;
      
      for await (const chunk of stream) {
        eventCount++;
        console.log(`イベント${eventCount}: ${chunk.type}`);
        
        if (chunk.type === "response.output_text.delta") {
          deltaCount++;
          console.log(`  デルタ${deltaCount}: "${chunk.delta}"`);
        } else if (chunk.type === "response.completed") {
          hasCompleted = true;
          console.log("  → 完了イベント検出!");
        }
      }
      
      console.log("総イベント数:", eventCount);
      console.log("デルタ数:", deltaCount); 
      console.log("完了イベント:", hasCompleted ? "✅" : "❌");
      
    } catch (error2) {
      console.error("❌ reasoning無しもエラー:", error2.message);
    }
  }
}

testStreamEventsDebug().catch(console.error);