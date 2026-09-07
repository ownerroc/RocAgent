// Debug Scaleway SDK - FIXED VERSION
const scaleway = require('scaleway-sdk');

console.log('Available exports:', Object.keys(scaleway));

// Test 1: Try RDB API (v1)
async function testRDB() {
  try {
    const client = new scaleway.Rdbv1({
      accessKey: process.env.SCW_ACCESS_KEY,
      secretKey: process.env.SCW_SECRET_KEY,
      organizationId: process.env.SCW_ORG_ID,
      region: "fr-par"
    });
    
    console.log('✅ RDB Client created');
    
    // Try to list instances
    const result = await client.listInstances({});
    console.log('RDB Instances:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ RDB Error:', err.message);
    if (err.response) console.error('Response:', err.response.data);
  }
}

// Test 2: Try Billing API (v1)
async function testBilling() {
  try {
    const client = new scaleway.Billingv2({
      accessKey: process.env.SCW_ACCESS_KEY,
      secretKey: process.env.SCW_SECRET_KEY,
      organizationId: process.env.SCW_ORG_ID
    });
    
    console.log('✅ Billing Client created');
    
    // Try to list invoices
    const result = await client.listInvoices({});
    console.log('Billing Invoices:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ Billing Error:', err.message);
    if (err.response) console.error('Response:', err.response.data);
  }
}

// Run tests
(async () => {
  console.log('Starting Scaleway SDK Tests...\n');
  await testRDB();
  console.log('\n---\n');
  await testBilling();
})();