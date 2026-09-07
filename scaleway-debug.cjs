#!/usr/bin/env node
/**
 * Scaleway Auth Debug - Find the right authentication method
 */

require('dotenv').config();
const https = require('https');

const SCW_SECRET_KEY = process.env.SCW_SECRET_KEY;
const SCW_PROJECT_ID = process.env.SCW_DEFAULT_PROJECT_ID || process.env.SCW_DEFAULT_ORGANIZATION_ID;
const SCW_ACCESS_KEY = process.env.SCW_ACCESS_KEY;

console.log('🔍 Scaleway Auth Debug');
console.log('======================\n');
console.log(`Access Key: ${SCW_ACCESS_KEY}`);
console.log(`Secret Key: ${SCW_SECRET_KEY?.substring(0, 12)}...`);
console.log(`Project ID: ${SCW_PROJECT_ID}\n`);

// Test different auth combinations
const tests = [
  // Method 1: X-Auth-Token with secret key
  {
    name: 'X-Auth-Token: secret-key-only',
    headers: { 'X-Auth-Token': SCW_SECRET_KEY }
  },
  // Method 2: X-Auth-Token with access-key:secret-key
  {
    name: 'X-Auth-Token: access:secret',
    headers: { 'X-Auth-Token': `${SCW_ACCESS_KEY}:${SCW_SECRET_KEY}` }
  },
  // Method 3: Bearer token with secret key
  {
    name: 'Bearer: secret-key',
    headers: { 'Authorization': `Bearer ${SCW_SECRET_KEY}` }
  },
  // Method 4: Bearer token with access-key:secret-key
  {
    name: 'Bearer: access:secret',
    headers: { 'Authorization': `Bearer ${SCW_ACCESS_KEY}:${SCW_SECRET_KEY}` }
  },
  // Method 5: Bearer token with just access key (for S3)
  {
    name: 'Bearer: access-key-only',
    headers: { 'Authorization': `Bearer ${SCW_ACCESS_KEY}` }
  },
];

// Test endpoints that we know might work
const endpoints = [
  { name: 'RDB List', url: 'https://api.scaleway.com/rdb/v1/regions/fr-par/instances' },
  { name: 'Billing', url: 'https://api.scaleway.com/billing/v1/invoices' },
  { name: 'S3 Service', url: 'https://s3.fr-par.scw.cloud/' },
  { name: 'Functions', url: 'https://api.scaleway.com/functions/v1/namespaces' },
  { name: 'Containers', url: 'https://api.scaleway.com/containers/v1/namespaces' },
];

async function test(authMethod, endpoint) {
  return new Promise((resolve) => {
    const urlObj = new URL(endpoint.url);
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        ...authMethod.headers,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data: data.substring(0, 200) }));
    });
    
    req.on('error', () => resolve({ status: 'ERR', data: '' }));
    req.end();
  });
}

async function run() {
  for (const auth of tests) {
    console.log(`\n🔐 Testing: ${auth.name}`);
    console.log('─'.repeat(40));
    
    for (const ep of endpoints) {
      const result = await test(auth, ep);
      let icon = '';
      if (result.status === 200) icon = '✅';
      else if (result.status === 401) icon = '❌';
      else if (result.status === 403) icon = '🔒';
      else if (result.status === 404) icon = '⚠️ ';
      else icon = '❓';
      
      console.log(`  ${icon} ${ep.name}: ${result.status}`);
    }
  }
  
  console.log('\n' + '='.repeat(40));
  console.log('💡 Best method should have most ✅ responses');
}

run();