// OpenAI SDKの正しい使用方法を検証するテスト
require('dotenv').config();
const OpenAI = require('openai');

async function testOpenAIAPI() {
  console.log("=== OpenAI API検証テスト ===");
  
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  // 利用可能なメソッドを確認
  console.log("\n利用可能なAPIメソッド:");
  console.log("- client.chat:", typeof client.chat);
  console.log("- client.completions:", typeof client.completions);
  console.log("- client.responses:", typeof client.responses);
  console.log("- client.chat.completions:", typeof client.chat?.completions);
  
  // 実際のAPIテスト
  console.log("\n実際のAPIテスト:");
  
  try {
    // 正しいOpenAI APIの使用方法
    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo", // または "gpt-4"
      messages: [
        { role: "system", content: "Translate English to Japanese." },
        { role: "user", content: "Hello, world!" }
      ],
      max_tokens: 100,
      temperature: 0.3
    });
    
    console.log("✅ 非ストリーミングレスポンス:", response.choices[0].message.content);
    
    // ストリーミング版
    console.log("\nストリーミングテスト:");
    const stream = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Translate English to Japanese." },
        { role: "user", content: "Life asks questions." }
      ],
      max_tokens: 100,
      temperature: 0.3,
      stream: true
    });
    
    let streamedContent = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      streamedContent += delta;
      if (delta) {
        console.log(`ストリームチャンク: "${delta}"`);
      }
    }
    console.log("✅ ストリーミング完了:", streamedContent);
    
  } catch (error) {
    console.error("❌ APIエラー:", error.message);
    console.error("エラー詳細:", error);
  }
}

testOpenAIAPI().catch(console.error);