import * as sdk from '@scaleway/sdk';

// Load .env
import { readFileSync } from 'fs';
const env = {};
readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length) env[key.trim()] = values.join('=').trim();
});

const secretKey = env.SCW_SECRET_KEY;
console.log('=== SCALEWAY SDK (@scaleway/sdk) Test ===');
console.log('Secret key:', secretKey ? secretKey.substring(0, 10) + '...' : 'NOT FOUND');

// Create RDB client
const rdb = new sdk.v1.RDB({
  region: 'fr-par',
  token: secretKey
});

console.log('\nTesting RDB listInstances...');

rdb.api.listInstances({}).then(result => {
  console.log('✅ Success!');
  console.log('Instances:', JSON.stringify(result, null, 2));
}).catch(err => {
  console.log('❌ Error:', err.message);
  if (err.response) {
    console.log('Response:', err.response.data);
  }
});