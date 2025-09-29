// 修正版translateTextStreamOptimizedの実装テスト
require('dotenv').config();
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

// 修正版のtranslateTextStreamOptimized実装
async function translateTextStreamOptimizedFixed({ 
  srcLang, 
  tgtLang, 
  text, 
  context, 
  glossary, 
  onToken, 
  onDone,
  contextWords = 40,
  useMinimalSystem = true
}) {
  console.log("translateTextStreamOptimizedFixed開始");
  console.log("パラメータ:", { srcLang, tgtLang, text, context, glossary });
  
  // コンテキスト圧縮（デフォルト40語）
  const contextWindow = (context && context !== text)
    ? context.split(/\s+/).slice(-contextWords).join(" ")
    : "";

  // System選択（最小 or 標準）
  const sys = useMinimalSystem 
    ? buildSystemMinimal()
    : `Standard system message for ${srcLang} to ${tgtLang}`;

  // User側にGlossary移動（Systemを軽く）
  const fixedGlossary = glossary || [];
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
    }
    
    console.log("API呼び出し開始...");
    const stream = await client.responses.create(requestParams);

    let acc = "";
    let tokenCount = 0;
    
    console.log("ストリーム処理開始...");
    for await (const ev of stream) {
      console.log(`イベント: ${ev.type}`);
      
      if (ev.type === "response.output_text.delta") {
        tokenCount++;
        acc += ev.delta;
        console.log(`トークン${tokenCount}: "${ev.delta}" (累計: "${acc}")`);
        if (onToken) {
          console.log("onTokenコールバック呼び出し...");
          onToken(ev.delta);
        }
      } else if (ev.type === "response.completed") {
        console.log(`完了イベント受信！最終テキスト: "${acc.trim()}"`);
        if (onDone) {
          console.log("onDoneコールバック呼び出し...");
          onDone(acc.trim());
        }
      }
    }
    
    console.log("ストリーム処理完了。返り値:", `"${acc.trim()}"`);
    return acc.trim();
    
  } catch (error) {
    console.error("❌ translateTextStreamOptimized内エラー:", error.message);
    console.error("スタックトレース:", error.stack);
    throw error;
  }
}

// テスト実行
async function testFixedStreamOptimized() {
  console.log("=== 修正版translateTextStreamOptimizedテスト ===");
  
  const text = "Life asks questions.";
  let tokens = [];
  let finalResult = "";
  let firstTokenTime = null;
  const start = Date.now();
  
  try {
    const result = await translateTextStreamOptimizedFixed({
      srcLang: "en",
      tgtLang: "ja",
      text: text,
      context: "",
      glossary: ["machine learning=>機械学習"],
      onToken: (delta) => {
        if (!firstTokenTime) {
          firstTokenTime = Date.now();
        }
        tokens.push(delta);
        console.log(`onTokenコールバック受信: "${delta}"`);
      },
      onDone: (final) => {
        finalResult = final;
        console.log(`onDoneコールバック受信: "${final}"`);
      }
    });
    
    console.log("\n=== テスト結果 ===");
    console.log("返り値:", `"${result}"`);
    console.log("onDoneの結果:", `"${finalResult}"`);
    console.log("総トークン数:", tokens.length);
    console.log("初期表示時間:", firstTokenTime ? (firstTokenTime - start) + "ms" : "N/A");
    console.log("完了時間:", (Date.now() - start) + "ms");
    
  } catch (error) {
    console.error("❌ テストエラー:", error.message);
  }
}

testFixedStreamOptimized().catch(console.error);