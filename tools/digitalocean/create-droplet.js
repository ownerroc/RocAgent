#!/usr/bin/env node
/**
 * DigitalOcean Droplet Creator
 * Usage: node create-droplet.js <api_token>
 * 
 * Creates a droplet with:
 * - Image: 243897263 (Ubuntu)
 * - Size: s-2vcpu-4gb
 * - Region: nyc1
 * - Name: agents-s-2vcpu-4gb-nyc1
 */

const DO_API = 'https://api.digitalocean.com/v2';

async function createDroplet(apiToken) {
  const dropletConfig = {
    name: 'agents-s-2vcpu-4gb-nyc1',
    region: 'nyc1',
    size: 's-2vcpu-4gb',
    image: '243897263',
    enable_monitoring: true,
    tags: []
  };

  console.log('📋 Creating droplet with config:', JSON.stringify(dropletConfig, null, 2));

  try {
    const response = await fetch(`${DO_API}/droplets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dropletConfig)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Droplet created successfully!');
      console.log('📊 Droplet ID:', data.droplet.id);
      console.log('📊 Droplet Name:', data.droplet.name);
      console.log('📊 IP Address:', data.droplet.networks.v4[0]?.ip_address || 'pending');
      console.log('📊 Status:', data.droplet.status);
      return data.droplet;
    } else {
      console.error('❌ Error:', data.message || 'Unknown error');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
const token = process.argv[2];
if (!token) {
  console.log('Usage: node create-droplet.js <api_token>');
  console.log('\nGet your token from: https://cloud.digitalocean.com/account/api/tokens');
  process.exit(1);
}

createDroplet(token);