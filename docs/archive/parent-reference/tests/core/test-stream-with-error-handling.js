// エラーハンドリング付きストリームテスト
require('dotenv').config();

// gpt5-helpers-optimized.jsの内容を直接コピーしてデバッグ
const OpenAI = require('openai');
const https = require('https');

const agent = new https.Agent({ 
  keepAlive: true, 
  maxSockets: 50,
  keepAliveMsecs: 1000
});

const MODEL_TRANSLATE = process.env.OPENAI_MODEL_TRANSLATE || "gpt-3.5-turbo";

const client = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  httpAgent: agent
});

function buildSystemMinimal() {
  return `You are a translator. Translate from en to ja. Keep terms as-is unless mapping is provided.`;
}

async function testStreamWithErrorHandling() {
  console.log("=== エラーハンドリング付きストリームテスト ===");
  console.log("モデル:", MODEL_TRANSLATE);
  
  const text = "Life asks questions.";
  const contextWords = 40;
  const useMinimalSystem = true;
  
  // コンテキスト圧縮（デフォルト40語）
  const contextWindow = "";
  
  // System選択（最小 or 標準）
  const sys = buildSystemMinimal();
  
  // User側にGlossary移動（Systemを軽く）
  const fixedGlossary = ["machine learning=>機械学習"];
  const usr = [
    contextWindow ? `Context (2 seg max): ${contextWindow}` : "",
    fixedGlossary.length && useMinimalSystem ? `Glossary: ${fixedGlossary.slice(0,10).join(", ")}` : "",
    `Text: ${text}`
  ].filter(Boolean).join("\n");
  
  console.log("System:", sys);
  console.log("User:", usr);
  
  try {
    // GPT-5系モデルのみreasoningパラメータをサポート
    const requestParams = {
      model: MODEL_TRANSLATE,
      input: [{ role: "system", content: sys }, { role: "user", content: usr }],
      max_output_tokens: 128,
      stream: true
    };
    
    // GPT-5系のモデルの場合のみreasoningを追加
    if (MODEL_TRANSLATE.includes('gpt-5')) {
      requestParams.reasoning = { effort: "low" };
      console.log("GPT-5系モデル検出: reasoningパラメータ追加");
    } else {
      console.log("GPT-3.5系モデル: reasoningパラメータなし");
    }
    
    console.log("リクエストパラメータ:", JSON.stringify(requestParams, null, 2));
    
    const stream = await client.responses.create(requestParams);
    
    let acc = "";
    let tokenCount = 0;
    let eventCount = 0;
    let doneEventReceived = false;
    
    for await (const ev of stream) {
      eventCount++;
      console.log(`イベント${eventCount}: ${ev.type}`);
      
      if (ev.type === "response.output_text.delta") {
        tokenCount++;
        acc += ev.delta;
        console.log(`  トークン${tokenCount}: "${ev.delta}"`);
      } else if (ev.type === "response.completed") {
        doneEventReceived = true;
        console.log(`  → 完了イベント受信！蓄積テキスト: "${acc.trim()}"`);
      }
    }
    
    console.log("\n=== 最終結果 ===");
    console.log("総イベント数:", eventCount);
    console.log("トークン数:", tokenCount);
    console.log("完了イベント受信:", doneEventReceived);
    console.log("蓄積テキスト:", `"${acc}"`);
    console.log("trimmedテキスト:", `"${acc.trim()}"`);
    
  } catch (error) {
    console.error("❌ エラー発生:", error.message);
    console.error("エラータイプ:", error.constructor.name);
    console.error("エラーコード:", error.code);
    console.error("スタックトレース:", error.stack);
  }
}

testStreamWithErrorHandling().catch(console.error);