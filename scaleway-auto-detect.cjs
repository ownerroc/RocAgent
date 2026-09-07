#!/usr/bin/env node
/**
 * Scaleway Auto-Detect Script
 * Mendeteksi semua layanan yang tersedia di akun Scaleway
 */

require('dotenv').config();
const https = require('https');

const SCW_ACCESS_KEY = process.env.SCW_ACCESS_KEY;
const SCW_SECRET_KEY = process.env.SCW_SECRET_KEY;
const PROJECT_ID = process.env.SCW_DEFAULT_PROJECT_ID || process.env.SCW_DEFAULT_ORGANIZATION_ID;

// Service definitions - correct API endpoints
const SERVICES = {
  // Serverless - use api.scaleway.com
  'Serverless Functions': {
    hostname: 'api.scaleway.com',
    endpoints: [
      { method: 'GET', path: '/functions/v1/regions/fr-par/namespaces', auth: true }
    ]
  },
  'Serverless Containers': {
    hostname: 'api.scaleway.com',
    endpoints: [
      { method: 'GET', path: '/containers/v1/regions/fr-par/namespaces', auth: true }
    ]
  },
  
  // Database (RDB)
  'RDB PostgreSQL/MySQL': {
    hostname: 'api.scaleway.com',
    endpoints: [
      { method: 'GET', path: '/rdb/v1/regions/fr-par/instances', auth: true }
    ]
  },
  
  // Object Storage - use s3.fr-par.scw.cloud
  'Object Storage (S3)': {
    hostname: 's3.fr-par.scw.cloud',
    endpoints: [
      { method: 'GET', path: '/', auth: true }
    ]
  },
  
  // Kubernetes
  'Kubernetes K8s': {
    hostname: 'api.scaleway.com',
    endpoints: [
      { method: 'GET', path: '/k8s/v1/regions/fr-par/clusters', auth: true }
    ]
  },
  
  // Container Registry
  'Container Registry': {
    hostname: 'api.scaleway.com',
    endpoints: [
      { method: 'GET', path: '/registry/v1/regions/fr-par/namespaces', auth: true }
    ]
  },
  
  // Secret Manager
  'Secret Manager': {
    hostname: 'api.scaleway.com',
    endpoints: [
      { method: 'GET', path: '/secret/v1/regions/fr-par/secrets', auth: true }
    ]
  },
  
  // IoT Hub
  'IoT Hub': {
    hostname: 'api.scaleway.com',
    endpoints: [
      { method: 'GET', path: '/iot/v1/regions/fr-par/hubs', auth: true }
    ]
  },
  
  // Elastic Metal (Dedicated Servers)
  'Elastic Metal': {
    hostname: 'api.scaleway.com',
    endpoints: [
      { method: 'GET', path: '/baremetal/v1/regions/fr-par/servers', auth: true }
    ]
  },
  
  // Messaging (NATS, SQS, etc)
  'Messaging (NATS/SQS)': {
    hostname: 'api.scaleway.com',
    endpoints: [
      { method: 'GET', path: '/messaging/v1/regions/fr-par/namespaces', auth: true }
    ]
  },
  
  // Load Balancer
  'Load Balancer': {
    hostname: 'api.scaleway.com',
    endpoints: [
      { method: 'GET', path: '/lbmgr/v1/regions/fr-par/lbs', auth: true }
    ]
  },
  
  // Instance (Servers/VMs)
  'Instance (VMs)': {
    hostname: 'api.scaleway.com',
    endpoints: [
      { method: 'GET', path: '/instance/v1/zones/fr-par-1/servers', auth: true }
    ]
  }
};

function makeRequest(serviceKey, service, endpoint) {
  return new Promise((resolve) => {
    const hostname = service.hostname || 'api.scaleway.com';
    
    const options = {
      hostname,
      port: 443,
      path: endpoint.path,
      method: endpoint.method,
      headers: {
        'X-Auth-Token': SCW_SECRET_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {}
        
        resolve({
          status: res.statusCode,
          data: json,
          error: res.statusCode >= 400 ? data.substring(0, 200) : null
        });
      });
    });

    req.on('error', (e) => {
      resolve({ status: 0, error: e.message, code: e.code, hostname: hostname, path: endpoint.path });
    });

    req.end();
  });
}

async function detectService(serviceKey, service) {
  const result = {
    name: serviceKey,
    status: 'unknown',
    details: null,
    resources: 0
  };

  try {
    for (const endpoint of service.endpoints) {
      const response = await makeRequest(serviceKey, service, endpoint);
      
      if (response.status === 200) {
        result.status = '✅ Available';
        
        // Count resources
        if (response.data) {
          if (Array.isArray(response.data)) {
            result.resources = response.data.length;
          } else if (response.data.total_count !== undefined) {
            result.resources = response.data.total_count;
          } else if (response.data.instances) {
            result.resources = response.data.instances.length;
          } else if (response.data.namespaces) {
            result.resources = response.data.namespaces.length;
          } else if (response.data.buckets) {
            result.resources = response.data.buckets.length;
          }
        }
        
        result.details = response.data;
        break;
      } else if (response.status === 401) {
        result.status = '❌ Auth Failed';
        result.details = response.error;
        break;
      } else if (response.status === 403) {
        result.status = '❌ Forbidden';
        result.details = response.error;
      } else if (response.status === 404) {
        result.status = '⚠️ Not Found';
        result.details = 'Endpoint tidak ada atau tidak diaktifkan';
      } else if (response.status === 402) {
        result.status = '❌ Quota Exceeded';
        result.details = response.error;
      } else if (response.status === 0) {
        result.status = '❌ Network Error';
        result.details = response.error;
      }
    }
  } catch (e) {
    result.status = '❌ Error';
    result.details = e.message;
  }

  return result;
}

async function autoDetect() {
  console.log('\n🔍 SCALEWAY AUTO-DETECT');
  console.log('='.repeat(50));
  console.log(`Project ID: ${PROJECT_ID || 'default'}`);
  console.log(`Access Key: ${SCW_ACCESS_KEY || 'NOT SET'}`);
  console.log(`Secret Key: ${SCW_SECRET_KEY ? SCW_SECRET_KEY.substring(0, 8) + '****' : 'NOT SET'}`);
  console.log('='.repeat(50));

  const results = [];
  
  for (const [key, service] of Object.entries(SERVICES)) {
    process.stdout.write(`\n⏳ Checking ${key}... `);
    const result = await detectService(key, service);
    
    if (result.status.includes('Available')) {
      console.log(`✅ (${result.resources} found)`);
    } else {
      console.log(result.status);
    }
    
    results.push(result);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 RINGKASAN');
  console.log('='.repeat(50));
  
  const available = results.filter(r => r.status.includes('Available'));
  const notFound = results.filter(r => r.status.includes('Not Found'));
  const errors = results.filter(r => r.status.includes('Error') || r.status.includes('Auth') || r.status.includes('Forbidden'));
  
  console.log(`✅ Available: ${available.length}`);
  console.log(`⚠️ Not Found: ${notFound.length}`);
  console.log(`❌ Errors: ${errors.length}`);
  
  console.log('\n📋 DETAIL:');
  results.forEach(r => {
    const icon = r.status.includes('Available') ? '✅' : r.status.includes('Not Found') ? '⚠️' : '❌';
    console.log(`  ${icon} ${r.name}: ${r.status} [${r.resources} resources]`);
  });

  return results;
}

// Run if executed directly
if (require.main === module) {
  autoDetect().catch(console.error);
}

module.exports = { autoDetect, detectService, SERVICES };