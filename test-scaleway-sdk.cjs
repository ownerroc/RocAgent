const scaleway = require('scaleway');

async function main() {
  const client = new scaleway.Client({
    accessKey: process.env.SCALEWAY_ACCESS_KEY,
    secretKey: process.env.SCALEWAY_SECRET_KEY,
    organizationId: process.env.SCALEWAY_ORGANIZATION_ID,
    projectId: process.env.SCALEWAY_PROJECT_ID,
  });

  const rdb = new scaleway.RdbBeta(client);

  console.log('Testing RDB instances list...');
  try {
    const result = await rdb.listInstances({});
    console.log('✅ Success!', JSON.stringify(result, null, 2));
  } catch (err) {
    console.log('❌ Error:', err.message);
    if (err.data) console.log('Details:', JSON.stringify(err.data, null, 2));
  }
}

main();