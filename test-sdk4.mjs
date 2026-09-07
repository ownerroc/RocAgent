import * as sdk from '@scaleway/sdk-client';

// Use real credentials from .env
const client = sdk.createClient({
  accessKey: 'SCW2CHAG3KAMSATFRRJE',
  secretKey: '034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720',
});

console.log('✅ Client created successfully!');
console.log('Client type:', client.constructor.name);

// Check what methods are available
console.log('\nAvailable methods:', Object.keys(client).slice(0, 20));