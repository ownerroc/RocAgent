// Test Scaleway SDK: list Object Storage buckets
import 'dotenv/config';
import { ObjectStorageV1Beta1 } from '@scaleway/sdk';

const client = new ObjectStorageV1Beta1({
  accessKey: process.env.SCW_ACCESS_KEY,
  secretKey: process.env.SCW_SECRET_KEY,
  defaultRegion: 'fr-par',
  defaultOrganizationId: process.env.SCW_DEFAULT_ORGANIZATION_ID,
});

try {
  const res = await client.listBuckets({});
  console.log('Buckets:', res.buckets);
} catch (e) {
  console.error('Error:', e.message);
}
