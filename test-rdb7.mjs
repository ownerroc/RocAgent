import { Rdbv1 } from '@scaleway/sdk-rdb';
import * as sdk from '@scaleway/sdk-client';

// Create client
const client = sdk.createClient({
  accessKey: 'SCW2CHAG3KAMSATFRRJE',
  secretKey: '034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720',
});

// Create RDB v1 API
const rdb = new Rdbv1.API(client, { region: 'fr-par' });

// List instances
console.log('Fetching RDB instances...');
const result = await rdb.listInstances();
console.log('✅ RDB Instances:', JSON.stringify(result, null, 2));