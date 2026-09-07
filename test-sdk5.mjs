// Test new Scaleway SDK - RDB v1
import { API } from '@scaleway/sdk-rdb/v1';

const secretKey = process.env.SCALEWAY_TOKEN || 'test';

const rdb = new API({
  region: 'fr-par',
  apiKey: secretKey,
});

console.log('RDB API created successfully!');

// Try to list instances
try {
  const result = await rdb.listInstances({});
  console.log('Result type:', typeof result);
  console.log('Result keys:', Object.keys(result));
  console.log('Instances:', result.instances || result.data?.instances || result);
} catch (e) {
  console.error('Error:', e.message);
  console.error('Details:', e);
}