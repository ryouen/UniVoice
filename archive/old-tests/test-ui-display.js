/**
 * UIディスプレイテスト
 * リアルタイム表示の動作確認
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 UniVoice UI表示テスト開始...\n');

// テストデータ
const testSegments = [
  { original: "Hello, welcome to today's lecture.", translation: "こんにちは、今日の講義へようこそ。" },
  { original: "We will be discussing artificial intelligence.", translation: "私たちは人工知能について議論します。" },
  { original: "Let's start with the basics.", translation: "基本から始めましょう。" }
];

// 表示シミュレーション
function simulateDisplay() {
  console.log('📺 リアルタイム表示シミュレーション:');
  console.log('=' .repeat(60));
  
  testSegments.forEach((segment, index) => {
    setTimeout(() => {
      console.log(`\n[${new Date().toLocaleTimeString()}]`);
      console.log(`🎤 音声認識: ${segment.original}`);
      console.log(`🌐 翻訳: ${segment.translation}`);
      console.log('-'.repeat(60));
    }, (index + 1) * 2000);
  });
}

// CSS適用確認
function checkCSS() {
  console.log('\n🎨 CSS適用チェック:');
  const cssPath = path.join(__dirname, 'src', 'styles', 'UniVoice.css');
  const fs = require('fs');
  
  if (fs.existsSync(cssPath)) {
    console.log('✅ UniVoice.css が存在します');
    
    // 重要なCSSクラスの確認
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    const importantClasses = [
      'translation-container',
      'realtime-section',
      'current-text',
      'text-segment'
    ];
    
    importantClasses.forEach(className => {
      if (cssContent.includes(`.${className}`)) {
        console.log(`✅ .${className} クラスが定義されています`);
      } else {
        console.log(`❌ .${className} クラスが見つかりません`);
      }
    });
  } else {
    console.log('❌ UniVoice.css が見つかりません');
  }
}

// メイン実行
console.log('1. CSS確認...');
checkCSS();

console.log('\n2. 表示シミュレーション開始...');
simulateDisplay();

// 起動コマンドの表示
setTimeout(() => {
  console.log('\n\n🚀 アプリケーションを起動するには:');
  console.log('=' .repeat(60));
  console.log('ターミナル1: npm run dev');
  console.log('ターミナル2: npm run electron');
  console.log('=' .repeat(60));
  console.log('\n📝 変更内容:');
  console.log('- リアルタイム表示の文字サイズ: 15px → 18px');
  console.log('- line-height: 1.6 → 1.8');
  console.log('- padding: 20px → 16px（背景色付き）');
  console.log('- ラベル追加（🎤 音声認識、🌐 翻訳）');
  console.log('- 背景色: 原文=#f8f9fa、翻訳=#e8f4fd');
}, 8000);