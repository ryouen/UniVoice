// client.responses APIの詳細調査
require('dotenv').config();
const OpenAI = require('openai');

async function testResponsesAPI() {
  console.log("=== Responses API詳細調査 ===");
  
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  
  // responsesオブジェクトの詳細
  console.log("\nclient.responsesの内容:");
  console.log("- typeof client.responses:", typeof client.responses);
  console.log("- client.responses.constructor.name:", client.responses.constructor.name);
  console.log("- 利用可能なメソッド:");
  
  for (const key in client.responses) {
    if (typeof client.responses[key] === 'function') {
      console.log(`  - ${key}: function`);
    }
  }
  
  // responsesの実装を確認
  console.log("\n実装の詳細:");
  console.log("- client.responses.create:", typeof client.responses.create);
  console.log("- client.responses.stream:", typeof client.responses.stream);
  
  // 実際に使ってみる
  console.log("\n実際のAPIテスト:");
  
  try {
    // create メソッドを試す（もし存在すれば）
    if (client.responses.create) {
      console.log("\nresponses.createをテスト中...");
      const response = await client.responses.create({
        model: "gpt-3.5-turbo",
        input: [
          { role: "system", content: "Translate English to Japanese." },
          { role: "user", content: "Hello!" }
        ],
        max_output_tokens: 100
      });
      console.log("✅ responses.create成功:", response);
    }
  } catch (error) {
    console.error("❌ responses.createエラー:", error.message);
    console.error("エラータイプ:", error.constructor.name);
    console.error("エラーコード:", error.code);
  }
  
  try {
    // stream メソッドを試す（もし存在すれば）
    if (client.responses.stream) {
      console.log("\nresponses.streamをテスト中...");
      const stream = await client.responses.stream({
        model: "gpt-3.5-turbo",
        input: [
          { role: "system", content: "Translate English to Japanese." },
          { role: "user", content: "Hello!" }
        ],
        max_output_tokens: 100
      });
      
      let content = "";
      for await (const chunk of stream) {
        console.log("チャンクタイプ:", chunk.type);
        if (chunk.type === 'response.output_text.delta' && chunk.delta) {
          content += chunk.delta;
        }
      }
      console.log("✅ responses.stream成功:", content);
    }
  } catch (error) {
    console.error("❌ responses.streamエラー:", error.message);
    console.error("エラータイプ:", error.constructor.name);
    console.error("エラーコード:", error.code);
  }
  
  // 標準的なchat.completionsとの比較
  console.log("\n=== 標準API（chat.completions）との比較 ===");
  try {
    const startTime = Date.now();
    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Translate English to Japanese." },
        { role: "user", content: "Hello!" }
      ],
      max_tokens: 100
    });
    console.log("✅ chat.completions成功:", response.choices[0].message.content);
    console.log("所要時間:", Date.now() - startTime, "ms");
  } catch (error) {
    console.error("❌ chat.completionsエラー:", error.message);
  }
}

testResponsesAPI().catch(console.error);