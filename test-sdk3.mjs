import * as sdk from '@scaleway/sdk-client';

// Check API class
console.log('API prototype:', Object.getOwnPropertyNames(sdk.API.prototype));

// Try creating a client
const client = sdk.createClient({
  accessKey: 'SCWXXXXXXXXXXXXXXXXX',
  secretKey: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
});

console.log('\nClient type:', client.constructor.name);
console.log('Client keys:', Object.keys(client));