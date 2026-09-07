const dotenv = require('dotenv');
const fs = require('fs');

console.log('=== Reading .env file directly ===');
const envContent = fs.readFileSync('.env', 'utf8');
console.log(envContent.substring(0, 500));

console.log('\n=== Loading with dotenv ===');
const result = dotenv.config();
console.log('dotenv.config() result:', result);

console.log('\n=== Environment variables ===');
console.log('PORT:', process.env.PORT);
console.log('HOST:', process.env.HOST);
console.log('NODE_ENV:', process.env.NODE_ENV);

console.log('\n=== All env vars with PORT ===');
for (const [key, value] of Object.entries(process.env)) {
  if (key.toLowerCase().includes('port') || key.toLowerCase().includes('host')) {
    console.log(`${key}: ${value}`);
  }
}