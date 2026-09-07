import * as sdk from '@scaleway/sdk-client';

// Check createClient signature
console.log('createClient:', sdk.createClient.toString().slice(0, 500));

// Try to see what API does
console.log('\nAPI:', sdk.API);