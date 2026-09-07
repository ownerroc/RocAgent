import * as sdk from '@scaleway/sdk';

// Check SDK structure
console.log('=== SDK Structure ===');
console.log('sdk:', Object.keys(sdk));

// Check what's in v1
if (sdk.v1) {
  console.log('sdk.v1:', Object.keys(sdk.v1));
} else {
  console.log('sdk.v1: NOT FOUND');
}

// Load .env - use correct path
import { readFileSync } from 'fs';
const env = {};
try {
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
  console.log('\n=== Env Keys ===');
  console.log('SCW_SECRET_KEY:', env.SCW_SECRET_KEY ? 'Found: ' + env.SCW_SECRET_KEY.substring(0, 10) + '...' : 'NOT FOUND');
  console.log('SCW_ACCESS_KEY:', env.SCW_ACCESS_KEY);
  console.log('SCW_DEFAULT_PROJECT_ID:', env.SCW_DEFAULT_PROJECT_ID);
} catch(e) {
  console.log('Error loading .env:', e.message);
}