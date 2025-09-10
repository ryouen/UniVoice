// Simple API key test using standard OpenAI API
require('dotenv').config();

const apiKey = process.env.OPENAI_API_KEY;
console.log('Testing API key:', apiKey ? apiKey.substring(0, 20) + '...' + apiKey.slice(-5) : 'NOT SET');

// Use fetch to test the API directly
async function testAPI() {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    console.log('Status:', response.status);
    
    if (response.status === 401) {
      const data = await response.json();
      console.log('Error:', data);
      console.log('\n⚠️ API key is invalid or revoked!');
      console.log('Please generate a new API key at: https://platform.openai.com/api-keys');
    } else if (response.ok) {
      console.log('✅ API key is valid!');
      const data = await response.json();
      console.log('Available models:', data.data.slice(0, 5).map(m => m.id));
    } else {
      console.log('Unexpected response:', await response.text());
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();