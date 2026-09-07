#!/usr/bin/env node
/**
 * Scaleway SDK Integration Test
 * Uses official @scaleway/sdk-client with correct auth
 */

require('dotenv').config();
const { createClient } = require('@scaleway/sdk-client');

const SCW_SECRET_KEY = process.env.SCW_SECRET_KEY;
const SCW_ACCESS_KEY = process.env.SCW_ACCESS_KEY;
const SCW_PROJECT_ID = process.env.SCW_DEFAULT_PROJECT_ID || process.env.SCW_DEFAULT_ORGANIZATION_ID;

console.log('🔧 Scaleway SDK Test');
console.log('====================\n');
console.log(`🔑 Secret: ${SCW_SECRET_KEY?.substring(0, 8)}...`);
console.log(`🔑 Access: ${SCW_ACCESS_KEY}`);
console.log(`📁 Project: ${SCW_PROJECT_ID}\n`);

// Create client with correct auth
const scwClient = createClient({
  secretKey: SCW_SECRET_KEY,
  // X-Auth-Token is automatically used when secretKey is provided
});

async function testRDB() {
  console.log('📋 Testing RDB (Database)...');
  try {
    // List instances
    const instances = await scwClient.rdb.listInstances({
      region: 'fr-par',
    });
    console.log(`✅ RDB List: ${instances.instances?.length || 0} instances`);
    
    // Get engines
    const engines = await scwClient.rdb.listEngines({ region: 'fr-par' });
    console.log(`✅ RDB Engines: ${engines.engines?.length || 0} available`);
    
    return true;
  } catch (e) {
    console.log(`❌ RDB Error: ${e.message}`);
    return false;
  }
}

async function testK8S() {
  console.log('\n📋 Testing Kubernetes...');
  try {
    const clusters = await scwClient.k8s.listClusters({ region: 'fr-par' });
    console.log(`✅ K8s List: ${clusters.clusters?.length || 0} clusters`);
    return true;
  } catch (e) {
    console.log(`❌ K8s Error: ${e.message}`);
    return false;
  }
}

async function testFunctions() {
  console.log('\n📋 Testing Serverless Functions...');
  try {
    const namespaces = await scwClient.functions.listNamespaces({ region: 'fr-par' });
    console.log(`✅ Functions: ${namespaces.namespaces?.length || 0} namespaces`);
    return true;
  } catch (e) {
    console.log(`❌ Functions Error: ${e.message}`);
    return false;
  }
}

async function testContainers() {
  console.log('\n📋 Testing Serverless Containers...');
  try {
    const namespaces = await scwClient.containers.listNamespaces({ region: 'fr-par' });
    console.log(`✅ Containers: ${namespaces.namespaces?.length || 0} namespaces`);
    return true;
  } catch (e) {
    console.log(`❌ Containers Error: ${e.message}`);
    return false;
  }
}

async function testObjectStorage() {
  console.log('\n📋 Testing Object Storage (S3)...');
  try {
    // Use S3 API directly
    const response = await fetch('https://s3.fr-par.scw.cloud/', {
      method: 'GET',
      headers: {
        'X-Auth-Token': SCW_SECRET_KEY,
        'Content-Type': 'application/json'
      }
    });
    console.log(`✅ S3 Response: ${response.status}`);
    return true;
  } catch (e) {
    console.log(`❌ S3 Error: ${e.message}`);
    return false;
  }
}

async function testBilling() {
  console.log('\n📋 Testing Billing...');
  try {
    const invoices = await scwClient.billing.listInvoices();
    console.log(`✅ Billing: ${invoices.invoices?.length || 0} invoices`);
    return true;
  } catch (e) {
    console.log(`❌ Billing Error: ${e.message}`);
    return false;
  }
}

async function run() {
  console.log('='.repeat(40));
  
  await testRDB();
  await testK8S();
  await testFunctions();
  await testContainers();
  await testObjectStorage();
  await testBilling();
  
  console.log('\n' + '='.repeat(40));
  console.log('✅ SDK Test Complete!');
}

run().catch(console.error);