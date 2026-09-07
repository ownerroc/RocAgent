// Test script untuk menguji semua model CFSherlock
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');

// Get password from .env
const passwordMatch = env.match(/WEB_PASSWORD=(.+)/);
const password = passwordMatch ? passwordMatch[1].trim() : '';

console.log('🔐 Testing RocSystem Login & Models\n');
console.log('Password found:', password ? `Yes (${password.length} chars)` : 'No');

const models = [
  { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B' },
  { id: 'mistralai/Mistral-Small-4-119B-2603', name: 'Mistral Small 4' },
  { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B' },
  { id: 'openai/gpt-5.6-sol-xhigh', name: 'GPT-5.6' }
];

async function test() {
  try {
    // Login
    console.log('\n📝 Attempting login...');
    const loginRes = await fetch('http://127.0.0.1:3001/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password })
    });
    const loginData = await loginRes.json();
    console.log('Login response:', JSON.stringify(loginData));
    
    if (!loginData.token) {
      console.log('\n❌ Login failed. Wrong password?');
      console.log('Please check WEB_PASSWORD in .env');
      return;
    }
    
    const token = loginData.token;
    console.log('✅ Logged in successfully!\n');
    
    // Test each model
    console.log('🔍 Testing LLM Models...\n');
    
    for (const model of models) {
      const start = Date.now();
      
      try {
        const execRes = await fetch('http://127.0.0.1:3001/api/exec', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({
            tool: 'askModel',
            args: {
              provider: 'openrouter',
              model: model.id,
              prompt: 'Hello, just say OK'
            }
          })
        });
        
        const data = await execRes.json();
        const elapsed = Date.now() - start;
        
        if (data.result || data.output) {
          console.log(`✅ ${model.name} - OK (${elapsed}ms)`);
        } else {
          console.log(`⚠️ ${model.name} - No response (${elapsed}ms)`);
        }
      } catch (e) {
        console.log(`❌ ${model.name} - ${e.message}`);
      }
    }
    
  } catch (e) {
    console.log('Error:', e.message);
  }
}

test();