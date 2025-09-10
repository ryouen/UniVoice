// Analyze API key format
require('dotenv').config();

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.log('❌ No API key found in environment');
  process.exit(1);
}

console.log('API Key Analysis:');
console.log('================');
console.log('Length:', apiKey.length);
console.log('Starts with:', apiKey.substring(0, 10));
console.log('Ends with:', apiKey.slice(-10));
console.log('Contains spaces:', apiKey.includes(' ') ? 'YES ⚠️' : 'NO ✅');
console.log('Contains newlines:', apiKey.includes('\n') || apiKey.includes('\r') ? 'YES ⚠️' : 'NO ✅');
console.log('Valid characters only:', /^[a-zA-Z0-9\-_]+$/.test(apiKey) ? 'YES ✅' : 'NO ⚠️');

// Check for common issues
if (apiKey.length !== apiKey.trim().length) {
  console.log('\n⚠️ WARNING: API key has leading/trailing whitespace!');
}

// Standard OpenAI key format check
if (apiKey.startsWith('sk-proj-')) {
  console.log('\n✅ Key format: Project-based key (sk-proj-)');
} else if (apiKey.startsWith('sk-')) {
  console.log('\n✅ Key format: Standard key (sk-)');
} else {
  console.log('\n⚠️ WARNING: Unexpected key format!');
}

// Check for suspicious patterns
if (apiKey.length > 200) {
  console.log('\n⚠️ WARNING: API key seems unusually long (>200 chars)');
}

console.log('\nRecommendations:');
console.log('1. Verify the key at: https://platform.openai.com/api-keys');
console.log('2. Check if the key is active and has not been revoked');
console.log('3. For project keys (sk-proj-), ensure you have the correct project permissions');
console.log('4. Consider generating a new API key if this one continues to fail');