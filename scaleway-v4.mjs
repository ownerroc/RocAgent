import { Rdbv1 } from '@scaleway/sdk';
import { readFileSync } from 'fs';

// Load .env
const env = {};
const envContent = readFileSync('.env', 'utf8');
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const key = trimmed.substring(0, idx).trim();
      const value = trimmed.substring(idx + 1).trim();
      env[key] = value;
    }
  }
});

const secretKey = env.SCW_SECRET_KEY;
const projectId = env.SCW_DEFAULT_PROJECT_ID;

console.log('=== SCALEWAY SDK v4 Test ===');
console.log('Secret:', secretKey.substring(0, 10) + '...');
console.log('Project:', projectId);

// Create RDB client
const rdb = new Rdbv1({
  region: 'fr-par',
  accessKey: env.SCW_ACCESS_KEY,
  secretKey: secretKey
});

console.log('\nTesting RDB listInstances...');

try {
  const result = await rdb.listInstances({});
  console.log('✅ Success!');
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.log('❌ Error:', err.message);
  if (err.data) console.log('Response:', JSON.stringify(err.data, null, 2));
}