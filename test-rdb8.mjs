import { Rdbv1 } from '@scaleway/sdk-rdb';
import * as sdk from '@scaleway/sdk-client';

// Create client
const client = sdk.createClient({
  accessKey: 'SCW2CHAG3KAMSATFRRJE',
  secretKey: '034c5ec1-7a33-4a71-9ef3-ccf2c3c7f720',
});

// Try different region formats
const regions = ['fr-par', 'fr-par-1', 'nl-ams', 'pl-waw'];

for (const region of regions) {
  try {
    const rdb = new Rdbv1.API(client, { region });
    console.log(`Testing region: ${region}`);
    const result = await rdb.listInstances();
    console.log(`✅ ${region}:`, JSON.stringify(result, null, 2));
  } catch (e) {
    console.log(`❌ ${region}:`, e.message);
  }
}